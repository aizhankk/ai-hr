from fastapi import UploadFile

from app.exceptions import EDSServiceException
from app.storage import storage
from db import database


class VideoService:
    async def _require_recruiter_owns_application(self, conn, application_id: str, user_id: str) -> dict:
        """Проверяет что заявка принадлежит вакансии этого рекрутера. Возвращает строку заявки."""
        row = await conn.fetchrow(
            """
            SELECT a.id, a.candidate_id
            FROM aihr.applications a
            JOIN aihr.job_postings jp    ON jp.id = a.job_posting_id
            JOIN aihr.recruiter_profiles rp ON rp.id = jp.recruiter_id
            WHERE a.id = $1::uuid AND rp.user_id = $2::uuid
            """,
            application_id, user_id,
        )
        if not row:
            raise EDSServiceException(
                code="APPLICATION_NOT_FOUND",
                message_ru="Заявка не найдена или нет доступа",
                message_kz="Өтініш табылмады немесе рұқсат жоқ",
                message_en="Application not found or access denied",
            )
        return dict(row)

    async def upload(self, application_id: str, recruiter_user_id: str, file: UploadFile) -> dict:
        """Рекрутер загружает запись интервью (Zoom и т.п.)."""
        async with database.db_pool.acquire() as conn:
            app = await self._require_recruiter_owns_application(conn, application_id, recruiter_user_id)
            candidate_id = str(app["candidate_id"])

            content = await file.read()
            _, url_path = await storage.save(content, file.filename or "interview.mp4", "videos")
            public = storage.public_url(url_path)

            row = await conn.fetchrow(
                """
                INSERT INTO aihr.video_interviews
                    (application_id, candidate_id, video_url, file_size_bytes, status, recorded_at)
                VALUES ($1::uuid, $2::uuid, $3, $4, 'uploaded', NOW())
                ON CONFLICT (application_id)
                DO UPDATE SET video_url      = EXCLUDED.video_url,
                              file_size_bytes = EXCLUDED.file_size_bytes,
                              status          = 'uploaded',
                              recorded_at     = NOW()
                RETURNING *
                """,
                application_id, candidate_id, public, len(content),
            )
            return dict(row)

    async def get_by_application(self, application_id: str) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM aihr.video_interviews WHERE application_id = $1::uuid",
                application_id,
            )
            if not row:
                raise EDSServiceException(
                    code="VIDEO_NOT_FOUND",
                    message_ru="Видео-интервью не найдено",
                    message_kz="Бейне-сұхбат табылмады",
                    message_en="Video interview not found",
                )
            result = dict(row)
            analysis = await conn.fetchrow(
                "SELECT * FROM aihr.video_analyses WHERE video_interview_id = $1::uuid",
                str(row["id"]),
            )
            result["analysis"] = dict(analysis) if analysis else None
            return result
