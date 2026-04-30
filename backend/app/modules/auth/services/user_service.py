from typing import Optional

from app.exceptions import EDSServiceException
from app.modules.auth.services.password_service import PasswordService
from db import database


class UserService:
    def __init__(self) -> None:
        self.password_service = PasswordService()

    async def ensure_email_available(self, email: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            exists = await conn.fetchval("SELECT 1 FROM users WHERE email = $1", email)
            if exists:
                raise EDSServiceException(
                    code="EMAIL_ALREADY_EXISTS",
                    message_ru="Пользователь с таким email уже существует",
                    message_kz="Осындай email бар пайдаланушы бұрыннан бар",
                    message_en="User with this email already exists",
                )

    async def get_active_user_by_email(self, email: str):
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, role FROM users WHERE email = $1 AND is_active = TRUE",
                email,
            )
            if not row:
                raise EDSServiceException(
                    code="USER_NOT_FOUND",
                    message_ru="Пользователь не найден",
                    message_kz="Пайдаланушы табылмады",
                    message_en="User not found",
                )
            return row

    async def get_all_users(self):
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    user_id AS id,
                    email,
                    role,
                    is_active,
                    email_verified,
                    created_at
                FROM users
                ORDER BY created_at DESC
                """
            )
            return [dict(row) for row in rows]

    async def register_user(
        self,
        *,
        email: str,
        password: str,
        role: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company_name: Optional[str] = None,
        position: Optional[str] = None,
    ) -> None:
        if role not in {"candidate", "recruiter"}:
            raise EDSServiceException(
                code="ROLE_INVALID",
                message_ru="Недопустимая роль",
                message_kz="Рөл жарамсыз",
                message_en="Invalid role",
            )
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )

        password_hash = self.password_service.hash_password(password)
        async with database.db_pool.acquire() as conn:
            async with conn.transaction():
                exists = await conn.fetchval("SELECT 1 FROM users WHERE email = $1", email)
                if exists:
                    raise EDSServiceException(
                        code="EMAIL_ALREADY_EXISTS",
                        message_ru="Пользователь с таким email уже существует",
                        message_kz="Осындай email бар пайдаланушы бұрыннан бар",
                        message_en="User with this email already exists",
                    )
                user_id = await conn.fetchval(
                    """
                    INSERT INTO users (email, password_hash, role, email_verified)
                    VALUES ($1, $2, $3::user_role, TRUE)
                    RETURNING id
                    """,
                    email,
                    password_hash,
                    role,
                )
                if role == "candidate":
                    await conn.execute(
                        """
                        INSERT INTO candidate_profiles (user_id, first_name, last_name)
                        VALUES ($1, $2, $3)
                        """,
                        user_id,
                        first_name or "Unknown",
                        last_name or "Unknown",
                    )
                else:
                    await conn.execute(
                        """
                        INSERT INTO recruiter_profiles (user_id, company_name, position)
                        VALUES ($1, $2, $3)
                        """,
                        user_id,
                        company_name or "Company",
                        position,
                    )

    async def authenticate(self, email: str, password: str):
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, role, password_hash FROM users WHERE email = $1 AND is_active = TRUE",
                email,
            )
            if not row or not self.password_service.verify_password(password, row["password_hash"]):
                raise EDSServiceException(
                    code="INVALID_CREDENTIALS",
                    message_ru="Неверный email или пароль",
                    message_kz="Email немесе құпиясөз қате",
                    message_en="Invalid email or password",
                )
            return row

    async def update_email(self, user_id: str, new_email: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2::uuid",
                new_email,
                user_id,
            )

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT password_hash FROM users WHERE id = $1::uuid AND is_active = TRUE",
                user_id,
            )
            if not row:
                raise EDSServiceException(
                    code="USER_NOT_FOUND",
                    message_ru="Пользователь не найден",
                    message_kz="Пайдаланушы табылмады",
                    message_en="User not found",
                )
            if not self.password_service.verify_password(current_password, row["password_hash"]):
                raise EDSServiceException(
                    code="INVALID_CURRENT_PASSWORD",
                    message_ru="Неверный текущий пароль",
                    message_kz="Ағымдағы құпиясөз қате",
                    message_en="Current password is incorrect",
                )
            new_hash = self.password_service.hash_password(new_password)
            await conn.execute(
                "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2::uuid",
                new_hash,
                user_id,
            )

    async def reset_password(self, email: str, new_password: str) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        new_hash = self.password_service.hash_password(new_password)
        async with database.db_pool.acquire() as conn:
            updated = await conn.execute(
                "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
                new_hash,
                email,
            )
            if updated.endswith("0"):
                raise EDSServiceException(
                    code="USER_NOT_FOUND",
                    message_ru="Пользователь не найден",
                    message_kz="Пайдаланушы табылмады",
                    message_en="User not found",
                )
