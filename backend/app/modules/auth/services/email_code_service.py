import hmac
import os
import secrets
from datetime import datetime, timedelta

from asyncpg import exceptions as pg_exceptions
from app.exceptions import EDSServiceException
from app.modules.auth.services.email_sender_service import EmailSenderService
from db import database


class EmailCodeService:
    def __init__(self) -> None:
        self.ttl_minutes = int(os.getenv("EMAIL_CODE_TTL_MINUTES", "10"))
        self.email_sender_service = EmailSenderService()

    def _build_code(self) -> str:
        return f"{secrets.randbelow(1000000):06d}"

    async def create_pending_registration(self, email: str, payload: dict) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )

        code = self._build_code()
        expires_at = datetime.utcnow() + timedelta(minutes=self.ttl_minutes)
        try:
            async with database.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO aihr.email_verifications (email, code, payload, expires_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (email) DO UPDATE
                    SET code = EXCLUDED.code,
                        payload = EXCLUDED.payload,
                        expires_at = EXCLUDED.expires_at,
                        created_at = NOW()
                    """,
                    email,
                    code,
                    payload,
                    expires_at,
                )
        except pg_exceptions.UndefinedTableError:
            raise EDSServiceException(
                code="EMAIL_VERIFICATIONS_TABLE_NOT_FOUND",
                message_ru="Таблица aihr.email_verifications не найдена",
                message_kz="aihr.email_verifications кестесі табылмады",
                message_en="Table aihr.email_verifications was not found",
            )
        await self.email_sender_service.send_code(email, code, "register", self.ttl_minutes)

    async def resend_registration_code(self, email: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )

        code = self._build_code()
        expires_at = datetime.utcnow() + timedelta(minutes=self.ttl_minutes)
        try:
            async with database.db_pool.acquire() as conn:
                payload = await conn.fetchval(
                    """
                    SELECT payload FROM aihr.email_verifications
                    WHERE email = $1
                    """,
                    email,
                )
                if not payload:
                    raise EDSServiceException(
                        code="PENDING_NOT_FOUND",
                        message_ru="Заявка на регистрацию не найдена",
                        message_kz="Тіркелу сұранысы табылмады",
                        message_en="Pending registration not found",
                    )
                await conn.execute(
                    """
                    UPDATE aihr.email_verifications
                    SET code = $2, expires_at = $3, created_at = NOW()
                    WHERE email = $1
                    """,
                    email,
                    code,
                    expires_at,
                )
        except pg_exceptions.UndefinedTableError:
            raise EDSServiceException(
                code="EMAIL_VERIFICATIONS_TABLE_NOT_FOUND",
                message_ru="Таблица aihr.email_verifications не найдена",
                message_kz="aihr.email_verifications кестесі табылмады",
                message_en="Table aihr.email_verifications was not found",
            )
        await self.email_sender_service.send_code(email, code, "register", self.ttl_minutes)

    async def verify_registration_code(self, email: str, code: str) -> dict:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )

        try:
            async with database.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT code, payload, expires_at
                    FROM aihr.email_verifications
                    WHERE email = $1
                    LIMIT 1
                    """,
                    email,
                )
                if not row:
                    raise EDSServiceException(
                        code="CODE_NOT_FOUND",
                        message_ru="Код подтверждения не найден",
                        message_kz="Растау коды табылмады",
                        message_en="Verification code not found",
                    )
                if row["expires_at"] < datetime.utcnow():
                    raise EDSServiceException(
                        code="CODE_EXPIRED",
                        message_ru="Код подтверждения истек",
                        message_kz="Растау кодының мерзімі аяқталды",
                        message_en="Verification code expired",
                    )
                if not hmac.compare_digest(row["code"], code):
                    raise EDSServiceException(
                        code="CODE_INVALID",
                        message_ru="Неверный код подтверждения",
                        message_kz="Растау коды қате",
                        message_en="Invalid verification code",
                    )
                await conn.execute("DELETE FROM aihr.email_verifications WHERE email = $1", email)
                return dict(row["payload"])
        except pg_exceptions.UndefinedTableError:
            raise EDSServiceException(
                code="EMAIL_VERIFICATIONS_TABLE_NOT_FOUND",
                message_ru="Таблица aihr.email_verifications не найдена",
                message_kz="aihr.email_verifications кестесі табылмады",
                message_en="Table aihr.email_verifications was not found",
            )

    async def request_code(self, email: str, purpose: str) -> None:
        # Backward-compatible flow for forgot password.
        if purpose != "forgot_password":
            raise EDSServiceException(
                code="PURPOSE_INVALID",
                message_ru="Неверный тип запроса кода",
                message_kz="Код сұрауының түрі қате",
                message_en="Invalid code request purpose",
            )
        code = self._build_code()
        expires_at = datetime.utcnow() + timedelta(minutes=self.ttl_minutes)
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS aihr.auth_email_codes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) NOT NULL,
                    purpose VARCHAR(64) NOT NULL,
                    code VARCHAR(10) NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    used_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
                """
            )
            await conn.execute(
                """
                INSERT INTO aihr.auth_email_codes (email, purpose, code, expires_at)
                VALUES ($1, $2, $3, $4)
                """,
                email,
                purpose,
                code,
                expires_at,
            )
        await self.email_sender_service.send_code(email, code, purpose, self.ttl_minutes)

    async def verify_code(self, email: str, purpose: str, code: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, code, expires_at
                FROM aihr.auth_email_codes
                WHERE email = $1 AND purpose = $2 AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                email,
                purpose,
            )
            if not row or row["expires_at"] < datetime.utcnow():
                raise EDSServiceException(
                    code="CODE_EXPIRED",
                    message_ru="Код подтверждения истек",
                    message_kz="Растау кодының мерзімі аяқталды",
                    message_en="Verification code expired",
                )
            if not hmac.compare_digest(row["code"], code):
                raise EDSServiceException(
                    code="CODE_INVALID",
                    message_ru="Неверный код подтверждения",
                    message_kz="Растау коды қате",
                    message_en="Invalid verification code",
                )
            await conn.execute(
                "UPDATE aihr.auth_email_codes SET used_at = NOW() WHERE id = $1",
                row["id"],
            )
