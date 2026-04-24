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
            exists = await conn.fetchval("SELECT 1 FROM aihr.users WHERE email = $1", email)
            if exists:
                raise EDSServiceException(
                    code="EMAIL_ALREADY_EXISTS",
                    message_ru="Пользователь с таким email уже существует",
                    message_kz="Осындай email бар пайдаланушы бұрыннан бар",
                    message_en="User with this email already exists",
                )

    async def create_verified_user_from_payload(self, email: str, payload: dict) -> None:
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        role = payload.get("role")
        if role not in {"candidate", "recruiter"}:
            raise EDSServiceException(
                code="ROLE_INVALID",
                message_ru="Недопустимая роль",
                message_kz="Рөл жарамсыз",
                message_en="Invalid role",
            )
        async with database.db_pool.acquire() as conn:
            async with conn.transaction():
                exists = await conn.fetchval("SELECT 1 FROM aihr.users WHERE email = $1", email)
                if exists:
                    raise EDSServiceException(
                        code="EMAIL_ALREADY_EXISTS",
                        message_ru="Пользователь с таким email уже существует",
                        message_kz="Осындай email бар пайдаланушы бұрыннан бар",
                        message_en="User with this email already exists",
                    )
                user_id = await conn.fetchval(
                    """
                    INSERT INTO aihr.users (email, password_hash, role, email_verified)
                    VALUES ($1, $2, $3::aihr.user_role, TRUE)
                    RETURNING id
                    """,
                    email,
                    payload["password_hash"],
                    role,
                )
                if role == "candidate":
                    await conn.execute(
                        """
                        INSERT INTO aihr.candidate_profiles (user_id, first_name, last_name)
                        VALUES ($1, $2, $3)
                        """,
                        user_id,
                        payload.get("first_name") or "Unknown",
                        payload.get("last_name") or "Unknown",
                    )
                else:
                    await conn.execute(
                        """
                        INSERT INTO aihr.recruiter_profiles (user_id, company_name, position)
                        VALUES ($1, $2, $3)
                        """,
                        user_id,
                        payload.get("company_name") or "Company",
                        payload.get("position"),
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
                "SELECT id, email, role FROM aihr.users WHERE email = $1 AND is_active = TRUE",
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
                FROM aihr.users
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
                exists = await conn.fetchval("SELECT 1 FROM aihr.users WHERE email = $1", email)
                if exists:
                    raise EDSServiceException(
                        code="EMAIL_ALREADY_EXISTS",
                        message_ru="Пользователь с таким email уже существует",
                        message_kz="Осындай email бар пайдаланушы бұрыннан бар",
                        message_en="User with this email already exists",
                    )
                user_id = await conn.fetchval(
                    """
                    INSERT INTO aihr.users (email, password_hash, role, email_verified)
                    VALUES ($1, $2, $3::aihr.user_role, TRUE)
                    RETURNING id
                    """,
                    email,
                    password_hash,
                    role,
                )
                if role == "candidate":
                    await conn.execute(
                        """
                        INSERT INTO aihr.candidate_profiles (user_id, first_name, last_name)
                        VALUES ($1, $2, $3)
                        """,
                        user_id,
                        first_name or "Unknown",
                        last_name or "Unknown",
                    )
                else:
                    await conn.execute(
                        """
                        INSERT INTO aihr.recruiter_profiles (user_id, company_name, position)
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
                "SELECT id, email, role, password_hash FROM aihr.users WHERE email = $1 AND is_active = TRUE",
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
                "UPDATE aihr.users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
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
