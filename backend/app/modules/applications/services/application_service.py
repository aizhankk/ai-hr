import asyncio
from pathlib import Path
from typing import Optional

from app.exceptions import EDSServiceException
from db import database


class ApplicationService:
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

    async def _recruiter_id(self, conn, user_id: str) -> str:
        row = await conn.fetchval(
            "SELECT id FROM recruiter_profiles WHERE user_id = $1::uuid", user_id
        )
        if not row:
            raise EDSServiceException(
                code="PROFILE_NOT_FOUND",
                message_ru="Профиль рекрутера не найден",
                message_kz="Рекрутер профилі табылмады",
                message_en="Recruiter profile not found",
            )
        return str(row)

    async def apply(
        self,
        user_id: str,
        job_posting_id: str,
        resume_id: Optional[str],
        cover_letter: Optional[str],
    ) -> dict:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            row = await conn.fetchrow(
                """
                INSERT INTO applications (candidate_id, job_posting_id, resume_id, cover_letter)
                VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
                RETURNING *
                """,
                candidate_id,
                job_posting_id,
                resume_id,
                cover_letter,
            )
            return dict(row)

    async def list_for_candidate(self, user_id: str) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            rows = await conn.fetch(
                """
                SELECT a.*, jp.title AS job_title, rp.company_name,
                       r.original_filename AS resume_filename,
                       r.file_url          AS resume_file_url
                FROM applications a
                JOIN job_postings jp       ON jp.id = a.job_posting_id
                JOIN recruiter_profiles rp ON rp.id = jp.recruiter_id
                LEFT JOIN resumes r        ON r.id  = a.resume_id
                WHERE a.candidate_id = $1::uuid
                ORDER BY a.applied_at DESC
                """,
                candidate_id,
            )
            return [dict(r) for r in rows]

    async def list_for_recruiter(self, user_id: str, job_posting_id: Optional[str] = None) -> list[dict]:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._recruiter_id(conn, user_id)
            base_query = """
                SELECT a.id, a.candidate_id, a.job_posting_id, a.resume_id,
                       a.status, a.applied_at, a.updated_at,
                       cp.first_name, cp.last_name,
                       u.email  AS candidate_email,
                       jp.title AS job_title,
                       ara.matching_score
                FROM applications a
                JOIN candidate_profiles cp    ON cp.id  = a.candidate_id
                JOIN users u                  ON u.id   = cp.user_id
                JOIN job_postings jp           ON jp.id  = a.job_posting_id
                LEFT JOIN ai_resume_analyses ara ON ara.application_id = a.id
            """
            if job_posting_id:
                rows = await conn.fetch(
                    base_query + "WHERE jp.recruiter_id = $1::uuid AND jp.id = $2::uuid ORDER BY ara.matching_score DESC NULLS LAST, a.applied_at DESC",
                    recruiter_id, job_posting_id,
                )
            else:
                rows = await conn.fetch(
                    base_query + "WHERE jp.recruiter_id = $1::uuid ORDER BY a.applied_at DESC",
                    recruiter_id,
                )
            return [dict(r) for r in rows]

    async def get_application(self, application_id: str, user_id: str, role: str) -> dict:
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT a.*, cp.first_name, cp.last_name, u.email AS candidate_email,
                       jp.title AS job_title, rp.company_name
                FROM applications a
                JOIN candidate_profiles cp ON cp.id = a.candidate_id
                JOIN users u               ON u.id  = cp.user_id
                JOIN job_postings jp       ON jp.id = a.job_posting_id
                JOIN recruiter_profiles rp ON rp.id = jp.recruiter_id
                WHERE a.id = $1::uuid
                """,
                application_id,
            )
            if not row:
                raise EDSServiceException(
                    code="APPLICATION_NOT_FOUND",
                    message_ru="Заявка не найдена",
                    message_kz="Өтініш табылмады",
                    message_en="Application not found",
                )
            result = dict(row)
            # Access control: candidate sees own, recruiter sees their job's
            if role == "candidate":
                cp_id = await conn.fetchval(
                    "SELECT id FROM candidate_profiles WHERE user_id = $1::uuid", user_id
                )
                if str(result["candidate_id"]) != str(cp_id):
                    raise EDSServiceException(
                        code="ACCESS_DENIED",
                        message_ru="Нет доступа",
                        message_kz="Рұқсат жоқ",
                        message_en="Access denied",
                    )
            elif role == "recruiter":
                rec_id = await conn.fetchval(
                    "SELECT id FROM recruiter_profiles WHERE user_id = $1::uuid", user_id
                )
                jp = await conn.fetchval(
                    "SELECT recruiter_id FROM job_postings WHERE id = $1::uuid",
                    result["job_posting_id"],
                )
                if str(jp) != str(rec_id):
                    raise EDSServiceException(
                        code="ACCESS_DENIED",
                        message_ru="Нет доступа",
                        message_kz="Рұқсат жоқ",
                        message_en="Access denied",
                    )
            return result

    async def get_candidate_profile(self, application_id: str, recruiter_user_id: str) -> dict:
        """Полный профиль кандидата по заявке — только для рекрутера-владельца вакансии."""
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._recruiter_id(conn, recruiter_user_id)
            # Проверяем что заявка принадлежит этому рекрутеру
            app = await conn.fetchrow(
                """
                SELECT a.candidate_id, a.job_posting_id, a.status, a.cover_letter, a.applied_at
                FROM applications a
                JOIN job_postings jp ON jp.id = a.job_posting_id
                WHERE a.id = $1::uuid AND jp.recruiter_id = $2::uuid
                """,
                application_id, recruiter_id,
            )
            if not app:
                raise EDSServiceException(
                    code="APPLICATION_NOT_FOUND",
                    message_ru="Заявка не найдена или нет доступа",
                    message_kz="Өтініш табылмады немесе рұқсат жоқ",
                    message_en="Application not found or access denied",
                )
            candidate_id = str(app["candidate_id"])
            profile = await conn.fetchrow(
                """
                SELECT cp.*, u.email
                FROM candidate_profiles cp
                JOIN users u ON u.id = cp.user_id
                WHERE cp.id = $1::uuid
                """,
                candidate_id,
            )
            skills = await conn.fetch(
                "SELECT * FROM candidate_skills WHERE candidate_id = $1::uuid",
                candidate_id,
            )
            resumes = await conn.fetch(
                """
                SELECT id, original_filename, file_path, file_url, is_primary, uploaded_at
                FROM resumes
                WHERE candidate_id = $1::uuid
                   OR id = $2::uuid
                ORDER BY is_primary DESC, uploaded_at DESC
                """,
                candidate_id,
                app["resume_id"],
            ) if app["resume_id"] else await conn.fetch(
                "SELECT id, original_filename, file_path, file_url, is_primary, uploaded_at FROM resumes WHERE candidate_id = $1::uuid ORDER BY is_primary DESC, uploaded_at DESC",
                candidate_id,
            )
            # AI анализ если уже был
            ai = await conn.fetchrow(
                "SELECT * FROM ai_resume_analyses WHERE application_id = $1::uuid",
                application_id,
            )
            from app.storage import storage
            resume_list = [
                {
                    **dict(r),
                    "file_url": storage.public_url(r.get("file_path") or r.get("file_url") or ""),
                }
                for r in resumes
            ]
            return {
                "application": dict(app),
                "profile": dict(profile) if profile else {},
                "skills": [dict(s) for s in skills],
                "resumes": resume_list,
                "ai_analysis": dict(ai) if ai else None,
            }

    async def analyze_resume(self, application_id: str, recruiter_user_id: str) -> dict:
        """Запускает AI-анализ резюме кандидата против описания вакансии."""
        from app.ai.cv_ml import rank_resumes_against_job
        from app.storage import storage

        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._recruiter_id(conn, recruiter_user_id)
            row = await conn.fetchrow(
                """
                SELECT a.id, a.candidate_id, a.resume_id, a.job_posting_id,
                       jp.description AS job_description, jp.title AS job_title
                FROM applications a
                JOIN job_postings jp ON jp.id = a.job_posting_id
                WHERE a.id = $1::uuid AND jp.recruiter_id = $2::uuid
                """,
                application_id, recruiter_id,
            )
            if not row:
                raise EDSServiceException(
                    code="APPLICATION_NOT_FOUND",
                    message_ru="Заявка не найдена или нет доступа",
                    message_kz="Өтініш табылмады немесе рұқсат жоқ",
                    message_en="Application not found or access denied",
                )

            # Берём резюме — либо прикреплённое к заявке, либо primary
            resume_row = None
            if row["resume_id"]:
                resume_row = await conn.fetchrow(
                    "SELECT file_path, file_url, original_filename FROM resumes WHERE id = $1::uuid",
                    row["resume_id"],
                )
            if not resume_row:
                resume_row = await conn.fetchrow(
                    "SELECT file_path, file_url, original_filename FROM resumes WHERE candidate_id = $1::uuid AND is_primary = TRUE LIMIT 1",
                    row["candidate_id"],
                )
            if not resume_row:
                raise EDSServiceException(
                    code="RESUME_NOT_FOUND",
                    message_ru="Резюме кандидата не найдено",
                    message_kz="Кандидат түйіндемесі табылмады",
                    message_en="Candidate resume not found",
                )

            # Читаем файл через storage backend (работает и локально и в Spaces)
            url_path: str = resume_row["file_path"] or resume_row["file_url"] or ""
            if not url_path:
                raise EDSServiceException(
                    code="RESUME_FILE_NOT_FOUND",
                    message_ru="Файл резюме не найден",
                    message_kz="Түйіндеме файлы табылмады",
                    message_en="Resume file not found on server",
                )
            try:
                content = await storage.read(url_path)
            except Exception:
                raise EDSServiceException(
                    code="RESUME_FILE_NOT_FOUND",
                    message_ru="Файл резюме не найден",
                    message_kz="Түйіндеме файлы табылмады",
                    message_en="Resume file not found on server",
                )
            filename = resume_row["original_filename"] or url_path.rsplit("/", 1)[-1]
            job_description = row["job_description"] or row["job_title"] or ""

            # Запускаем ML в отдельном потоке
            results = await asyncio.to_thread(
                rank_resumes_against_job, job_description, [(filename, content)]
            )
            result = results[0] if results else {}

            # Сохраняем в ai_resume_analyses
            ai_row = await conn.fetchrow(
                """
                INSERT INTO ai_resume_analyses
                    (application_id, resume_id, job_posting_id,
                     matching_score, skills_matched, skills_missing, summary, rank_position,
                     skill_overlap, semantic_score, experience_years, education,
                     analyzed_at)
                VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, 1, $8, $9, $10, $11, NOW())
                ON CONFLICT (application_id) DO UPDATE
                    SET matching_score  = EXCLUDED.matching_score,
                        skills_matched  = EXCLUDED.skills_matched,
                        summary         = EXCLUDED.summary,
                        skill_overlap   = EXCLUDED.skill_overlap,
                        semantic_score  = EXCLUDED.semantic_score,
                        experience_years = EXCLUDED.experience_years,
                        education       = EXCLUDED.education,
                        analyzed_at     = NOW()
                RETURNING *
                """,
                application_id,
                row["resume_id"],
                row["job_posting_id"],
                result.get("match_score", 0.0),
                result.get("skills", []),
                [],
                result.get("preview", "")[:500],
                result.get("skill_overlap", 0.0),
                result.get("semantic_score", 0.0),
                result.get("experience_years", 0),
                result.get("education", ""),
            )
            return {
                **dict(ai_row),
                "match_score": result.get("match_score", 0.0),
                "skill_overlap": result.get("skill_overlap", 0.0),
                "semantic_score": result.get("semantic_score", 0.0),
                "experience_years": result.get("experience_years", 0),
                "education": result.get("education", ""),
                "skills_detected": result.get("skills", []),
            }

    async def update_status(self, application_id: str, user_id: str, status: str) -> dict:
        async with database.db_pool.acquire() as conn:
            recruiter_id = await self._recruiter_id(conn, user_id)
            row = await conn.fetchrow(
                """
                UPDATE applications a
                SET status = $2::application_status, updated_at = NOW()
                FROM job_postings jp
                WHERE a.id = $1::uuid
                  AND a.job_posting_id = jp.id
                  AND jp.recruiter_id = $3::uuid
                RETURNING a.*
                """,
                application_id,
                status,
                recruiter_id,
            )
            if not row:
                raise EDSServiceException(
                    code="APPLICATION_NOT_FOUND",
                    message_ru="Заявка не найдена или нет доступа",
                    message_kz="Өтініш табылмады немесе рұқсат жоқ",
                    message_en="Application not found or access denied",
                )
            return dict(row)