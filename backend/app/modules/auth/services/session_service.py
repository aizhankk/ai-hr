from app.exceptions import EDSServiceException
from app.modules.auth.services.token_service import TokenPair
from db import database


class SessionService:
    async def create_session(self, user_id, token_pair: TokenPair) -> None:
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
                INSERT INTO aihr.user_sessions (user_id, session_token, refresh_token, expires_at, is_active)
                VALUES ($1, $2, $3, $4, TRUE)
                """,
                user_id,
                token_pair.access_token,
                token_pair.refresh_token,
                token_pair.refresh_expires_at,
            )

    async def find_active_refresh_session(self, refresh_token: str):
        if database.db_pool is None:
            raise EDSServiceException(
                code="DB_UNAVAILABLE",
                message_ru="База данных недоступна",
                message_kz="Дерекқор қолжетімсіз",
                message_en="Database unavailable",
            )
        async with database.db_pool.acquire() as conn:
            session = await conn.fetchrow(
                """
                SELECT us.id, u.id AS user_id, u.email, u.role
                FROM aihr.user_sessions us
                JOIN aihr.users u ON u.id = us.user_id
                WHERE us.refresh_token = $1 AND us.is_active = TRUE AND us.revoked_at IS NULL AND us.expires_at > NOW()
                LIMIT 1
                """,
                refresh_token,
            )
            if not session:
                raise EDSServiceException(
                    code="UNAUTHORIZED",
                    message_ru="Недействительная сессия",
                    message_kz="Жарамсыз сессия",
                    message_en="Invalid session",
                )
            return session

    async def rotate_session_tokens(self, session_id, token_pair: TokenPair) -> None:
        if database.db_pool is None:
            return
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE aihr.user_sessions
                SET session_token = $1, refresh_token = $2, expires_at = $3
                WHERE id = $4
                """,
                token_pair.access_token,
                token_pair.refresh_token,
                token_pair.refresh_expires_at,
                session_id,
            )

    async def revoke_by_access_token(self, access_token: str) -> None:
        if database.db_pool is None:
            return
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE aihr.user_sessions
                SET is_active = FALSE, revoked_at = NOW()
                WHERE session_token = $1
                """,
                access_token,
            )

    async def revoke_by_email(self, email: str) -> None:
        if database.db_pool is None:
            return
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE aihr.user_sessions
                SET is_active = FALSE, revoked_at = NOW()
                WHERE user_id = (SELECT id FROM aihr.users WHERE email = $1)
                """,
                email,
            )
