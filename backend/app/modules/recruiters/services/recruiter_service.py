from app.exceptions import EDSServiceException
from db import database


class RecruiterService:
    async def get_by_user_id(self, user_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM recruiter_profiles WHERE user_id = $1::uuid",
                user_id,
            )
            if not row:
                raise EDSServiceException(
                    code="PROFILE_NOT_FOUND",
                    message_ru="Профиль рекрутера не найден",
                    message_kz="Рекрутер профилі табылмады",
                    message_en="Recruiter profile not found",
                )
            return dict(row)

    async def update(self, user_id: str, data: dict) -> dict:
        fields = {k: v for k, v in data.items() if v is not None}
        if not fields:
            return await self.get_by_user_id(user_id)
        set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(fields)]
        query = (
            f"UPDATE recruiter_profiles "
            f"SET {', '.join(set_parts)}, updated_at = NOW() "
            f"WHERE user_id = $1::uuid "
            f"RETURNING *"
        )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id, *fields.values())
            if not row:
                raise EDSServiceException(
                    code="PROFILE_NOT_FOUND",
                    message_ru="Профиль рекрутера не найден",
                    message_kz="Рекрутер профилі табылмады",
                    message_en="Recruiter profile not found",
                )
            return dict(row)