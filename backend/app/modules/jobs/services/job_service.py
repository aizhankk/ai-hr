from typing import Optional
from app.exceptions import EDSServiceException
from db import database


class JobService:
    async def _require_recruiter(self, conn, user_id: str) -> str:
        """Return recruiter_profiles.id for the given user, raises if not found."""
        row = await conn.fetchval(
            "SELECT id FROM aihr.recruiter_profiles WHERE user_id = $1::uuid",
            user_id,
        )
        if not row:
            raise EDSServiceException(
                code="RECRUITER_PROFILE_NOT_FOUND",
                message_ru="Профиль рекрутера не найден",
                message_kz="Рекрутер профилі табылмады",
                message_en="Recruiter profile not found",
            )
        return str(row)

    async def create(self, user_id: str, data: dict) -> dict:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            row = await conn.fetchrow(
                """
                INSERT INTO aihr.job_postings
                    (recruiter_id, title, description, requirements, employment_type,
                     location, is_remote, salary_min, salary_max, currency, status)
                VALUES ($1::uuid, $2, $3, $4, $5::aihr.employment_type,
                        $6, $7, $8, $9, $10, 'draft')
                RETURNING *
                """,
                recruiter_id,
                data["title"],
                data["description"],
                data.get("requirements"),
                data.get("employment_type", "full_time"),
                data.get("location"),
                data.get("is_remote", False),
                data.get("salary_min"),
                data.get("salary_max"),
                data.get("currency", "USD"),
            )
            return dict(row)

    async def list_published(
        self,
        limit: int = 50,
        offset: int = 0,
        search: str = "",
        employment_type: str = "",
        location: str = "",
    ) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            filters = ["jp.status = 'published'"]
            args: list = []

            if search:
                args.append(f"%{search.lower()}%")
                filters.append(
                    f"(LOWER(jp.title) LIKE ${len(args)} OR LOWER(rp.company_name) LIKE ${len(args)} OR LOWER(jp.description) LIKE ${len(args)})"
                )
            if employment_type:
                args.append(employment_type)
                filters.append(f"jp.employment_type = ${len(args)}::aihr.employment_type")
            if location:
                args.append(f"%{location.lower()}%")
                filters.append(f"LOWER(jp.location) LIKE ${len(args)}")

            where = " AND ".join(filters)
            args += [limit, offset]
            rows = await conn.fetch(
                f"""
                SELECT jp.*, rp.company_name
                FROM aihr.job_postings jp
                JOIN aihr.recruiter_profiles rp ON rp.id = jp.recruiter_id
                WHERE {where}
                ORDER BY jp.published_at DESC
                LIMIT ${len(args) - 1} OFFSET ${len(args)}
                """,
                *args,
            )
            return [dict(r) for r in rows]

    async def get_by_id(self, job_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT jp.*, rp.company_name
                FROM aihr.job_postings jp
                JOIN aihr.recruiter_profiles rp ON rp.id = jp.recruiter_id
                WHERE jp.id = $1::uuid
                """,
                job_id,
            )
            if not row:
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена",
                    message_kz="Вакансия табылмады",
                    message_en="Job posting not found",
                )
            skills = await conn.fetch(
                "SELECT * FROM aihr.job_skills WHERE job_posting_id = $1::uuid",
                job_id,
            )
            result = dict(row)
            result["skills"] = [dict(s) for s in skills]
            return result

    async def get_my_jobs(self, user_id: str) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            rows = await conn.fetch(
                "SELECT * FROM aihr.job_postings WHERE recruiter_id = $1::uuid ORDER BY created_at DESC",
                recruiter_id,
            )
            return [dict(r) for r in rows]

    async def update(self, job_id: str, user_id: str, data: dict) -> dict:
        fields = {k: v for k, v in data.items() if v is not None}
        if not fields:
            return await self.get_by_id(job_id)
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            set_parts = [f"{k} = ${i + 3}" for i, k in enumerate(fields)]
            query = (
                f"UPDATE aihr.job_postings "
                f"SET {', '.join(set_parts)}, updated_at = NOW() "
                f"WHERE id = $1::uuid AND recruiter_id = $2::uuid "
                f"RETURNING *"
            )
            row = await conn.fetchrow(query, job_id, recruiter_id, *fields.values())
            if not row:
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена или нет доступа",
                    message_kz="Вакансия табылмады немесе рұқсат жоқ",
                    message_en="Job not found or access denied",
                )
            return dict(row)

    async def change_status(self, job_id: str, user_id: str, status: str) -> dict:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            published_at_clause = ", published_at = NOW()" if status == "published" else ""
            row = await conn.fetchrow(
                f"""
                UPDATE aihr.job_postings
                SET status = $3::aihr.job_status, updated_at = NOW(){published_at_clause}
                WHERE id = $1::uuid AND recruiter_id = $2::uuid
                RETURNING *
                """,
                job_id,
                recruiter_id,
                status,
            )
            if not row:
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена или нет доступа",
                    message_kz="Вакансия табылмады немесе рұқсат жоқ",
                    message_en="Job not found or access denied",
                )
            return dict(row)

    async def delete(self, job_id: str, user_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            result = await conn.execute(
                "DELETE FROM aihr.job_postings WHERE id = $1::uuid AND recruiter_id = $2::uuid",
                job_id,
                recruiter_id,
            )
            if result.endswith("0"):
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена или нет доступа",
                    message_kz="Вакансия табылмады немесе рұқсат жоқ",
                    message_en="Job not found or access denied",
                )

    async def add_skill(
        self, job_id: str, user_id: str, skill_name: str, level: Optional[str], is_required: bool
    ) -> dict:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            owns = await conn.fetchval(
                "SELECT 1 FROM aihr.job_postings WHERE id = $1::uuid AND recruiter_id = $2::uuid",
                job_id,
                recruiter_id,
            )
            if not owns:
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена или нет доступа",
                    message_kz="Вакансия табылмады немесе рұқсат жоқ",
                    message_en="Job not found or access denied",
                )
            row = await conn.fetchrow(
                """
                INSERT INTO aihr.job_skills (job_posting_id, skill_name, level, is_required)
                VALUES ($1::uuid, $2, $3::aihr.skill_level, $4)
                RETURNING *
                """,
                job_id,
                skill_name,
                level,
                is_required,
            )
            return dict(row)

    async def remove_skill(self, job_id: str, skill_id: str, user_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._require_recruiter(conn, user_id)
            owns = await conn.fetchval(
                "SELECT 1 FROM aihr.job_postings WHERE id = $1::uuid AND recruiter_id = $2::uuid",
                job_id,
                recruiter_id,
            )
            if not owns:
                raise EDSServiceException(
                    code="JOB_NOT_FOUND",
                    message_ru="Вакансия не найдена или нет доступа",
                    message_kz="Вакансия табылмады немесе рұқсат жоқ",
                    message_en="Job not found or access denied",
                )
            result = await conn.execute(
                "DELETE FROM aihr.job_skills WHERE id = $1::uuid AND job_posting_id = $2::uuid",
                skill_id,
                job_id,
            )
            if result.endswith("0"):
                raise EDSServiceException(
                    code="SKILL_NOT_FOUND",
                    message_ru="Навык не найден",
                    message_kz="Дағды табылмады",
                    message_en="Skill not found",
                )