from fastapi import UploadFile

from app.exceptions import EDSServiceException
from app.storage import storage
from db import database


class ResumeService:
    async def _candidate_id(self, conn, user_id: str) -> str:
        row = await conn.fetchval(
            "SELECT id FROM candidate_profiles WHERE user_id = $1::uuid", user_id
        )
        if not row:
            raise EDSServiceException(
                code="PROFILE_NOT_FOUND",
                message_ru="Профиль кандидата не найден",
                message_kz="Кандидат профилі табылмады",
                message_en="Candidate profile not found",
            )
        return str(row)

    async def upload(self, user_id: str, file: UploadFile) -> dict:
        content = await file.read()
        file_uuid, url_path = await storage.save(content, file.filename or "resume", "resumes")

        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            has_primary = await conn.fetchval(
                "SELECT 1 FROM resumes WHERE candidate_id = $1::uuid AND is_primary = TRUE",
                candidate_id,
            )
            row = await conn.fetchrow(
                """
                INSERT INTO resumes
                    (candidate_id, file_uuid, file_path, file_url, original_filename,
                     file_size_bytes, mime_type, is_primary)
                VALUES ($1::uuid, $2::uuid, $3, $3, $4, $5, $6, $7)
                RETURNING *
                """,
                candidate_id,
                file_uuid,
                url_path,
                file.filename,
                len(content),
                file.content_type or "application/pdf",
                not has_primary,
            )
            return {**dict(row), "file_url": storage.public_url(url_path)}

    async def list_resumes(self, user_id: str) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            rows = await conn.fetch(
                "SELECT * FROM resumes WHERE candidate_id = $1::uuid ORDER BY uploaded_at DESC",
                candidate_id,
            )
            return [
                {**dict(r), "file_url": storage.public_url(r.get("file_path") or r.get("file_url") or "")}
                for r in rows
            ]

    async def get_with_parsed(self, resume_id: str, user_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            row = await conn.fetchrow(
                "SELECT * FROM resumes WHERE id = $1::uuid AND candidate_id = $2::uuid",
                resume_id, candidate_id,
            )
            if not row:
                raise EDSServiceException(
                    code="RESUME_NOT_FOUND",
                    message_ru="Резюме не найдено",
                    message_kz="Түйіндеме табылмады",
                    message_en="Resume not found",
                )
            result = {**dict(row), "file_url": storage.public_url(row.get("file_path") or row.get("file_url") or "")}
            parsed = await conn.fetchrow(
                "SELECT * FROM resume_parsed_data WHERE resume_id = $1::uuid", resume_id
            )
            result["parsed_data"] = dict(parsed) if parsed else None
            edu = await conn.fetch(
                "SELECT * FROM resume_education WHERE resume_id = $1::uuid ORDER BY display_order",
                resume_id,
            )
            result["education"] = [dict(e) for e in edu]
            exp = await conn.fetch(
                "SELECT * FROM resume_work_experience WHERE resume_id = $1::uuid ORDER BY display_order",
                resume_id,
            )
            result["work_experience"] = [dict(e) for e in exp]
            skills = await conn.fetch(
                "SELECT * FROM resume_skills WHERE resume_id = $1::uuid", resume_id
            )
            result["skills"] = [dict(s) for s in skills]
            return result

    async def delete(self, resume_id: str, user_id: str) -> None:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            row = await conn.fetchrow(
                "SELECT file_path FROM resumes WHERE id = $1::uuid AND candidate_id = $2::uuid",
                resume_id, candidate_id,
            )
            if not row:
                raise EDSServiceException(
                    code="RESUME_NOT_FOUND",
                    message_ru="Резюме не найдено",
                    message_kz="Түйіндеме табылмады",
                    message_en="Resume not found",
                )
            await conn.execute("DELETE FROM resumes WHERE id = $1::uuid", resume_id)
        if row["file_path"]:
            await storage.delete(row["file_path"])

    async def set_primary(self, resume_id: str, user_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            owns = await conn.fetchval(
                "SELECT 1 FROM resumes WHERE id = $1::uuid AND candidate_id = $2::uuid",
                resume_id, candidate_id,
            )
            if not owns:
                raise EDSServiceException(
                    code="RESUME_NOT_FOUND",
                    message_ru="Резюме не найдено",
                    message_kz="Түйіндеме табылмады",
                    message_en="Resume not found",
                )
            async with conn.transaction():
                await conn.execute(
                    "UPDATE resumes SET is_primary = FALSE WHERE candidate_id = $1::uuid",
                    candidate_id,
                )
                row = await conn.fetchrow(
                    "UPDATE resumes SET is_primary = TRUE WHERE id = $1::uuid RETURNING *",
                    resume_id,
                )
            return {**dict(row), "file_url": storage.public_url(row.get("file_path") or row.get("file_url") or "")}