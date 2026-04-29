from typing import Optional
from app.exceptions import EDSServiceException
from db import database


class CandidateService:
    async def get_by_user_id(self, user_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM candidate_profiles WHERE user_id = $1::uuid",
                user_id,
            )
            if not row:
                raise EDSServiceException(
                    code="PROFILE_NOT_FOUND",
                    message_ru="Профиль кандидата не найден",
                    message_kz="Кандидат профилі табылмады",
                    message_en="Candidate profile not found",
                )
            return dict(row)

    async def update(self, user_id: str, data: dict) -> dict:
        fields = {k: v for k, v in data.items() if v is not None}
        if not fields:
            return await self.get_by_user_id(user_id)
        set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(fields)]
        query = (
            f"UPDATE candidate_profiles "
            f"SET {', '.join(set_parts)}, updated_at = NOW() "
            f"WHERE user_id = $1::uuid "
            f"RETURNING *"
        )
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id, *fields.values())
            if not row:
                raise EDSServiceException(
                    code="PROFILE_NOT_FOUND",
                    message_ru="Профиль кандидата не найден",
                    message_kz="Кандидат профилі табылмады",
                    message_en="Candidate profile not found",
                )
            return dict(row)

    async def get_skills(self, candidate_id: str) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM candidate_skills WHERE candidate_id = $1::uuid",
                candidate_id,
            )
            return [dict(r) for r in rows]

    async def add_skill(
        self,
        candidate_id: str,
        skill_name: str,
        level: Optional[str],
        years_experience: Optional[int],
    ) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO candidate_skills (candidate_id, skill_name, level, years_experience)
                VALUES ($1::uuid, $2, $3::skill_level, $4)
                ON CONFLICT (candidate_id, skill_name)
                DO UPDATE SET level = EXCLUDED.level, years_experience = EXCLUDED.years_experience
                RETURNING *
                """,
                candidate_id,
                skill_name,
                level,
                years_experience,
            )
            return dict(row)

    async def remove_skill(self, candidate_id: str, skill_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM candidate_skills WHERE id = $1::uuid AND candidate_id = $2::uuid",
                skill_id,
                candidate_id,
            )
            if result.endswith("0"):
                raise EDSServiceException(
                    code="SKILL_NOT_FOUND",
                    message_ru="Навык не найден",
                    message_kz="Дағды табылмады",
                    message_en="Skill not found",
                )