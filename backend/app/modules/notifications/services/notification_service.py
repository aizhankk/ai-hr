from typing import Optional
from app.exceptions import EDSServiceException
from db import database


class NotificationService:
    async def list(self, user_id: str) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM notifications
                WHERE user_id = $1::uuid
                ORDER BY created_at DESC
                """,
                user_id,
            )
            return [dict(r) for r in rows]

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = $1::uuid AND user_id = $2::uuid
                """,
                notification_id,
                user_id,
            )
            if result.endswith("0"):
                raise EDSServiceException(
                    code="NOTIFICATION_NOT_FOUND",
                    message_ru="Уведомление не найдено",
                    message_kz="Хабарлама табылмады",
                    message_en="Notification not found",
                )

    async def mark_all_read(self, user_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1::uuid",
                user_id,
            )

    async def create(
        self,
        user_id: str,
        notification_type: str,
        message: str,
        payload: Optional[dict] = None,
    ) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO notifications (user_id, type, message, payload)
                VALUES ($1::uuid, $2::notification_type, $3, $4)
                RETURNING *
                """,
                user_id,
                notification_type,
                message,
                payload or {},
            )
            return dict(row)