"""Семантический подбор вакансий под резюме кандидата.

В отличие от TF-IDF-матчинга (``app.ai.cv_ml``), здесь резюме и вакансии
сравниваются по *смыслу*: текст превращается в вектор-эмбеддинг, а близость
ищется по косинусному расстоянию в pgvector. Так «React» матчится с
«фронтенд-разработкой», даже если буквального совпадения слов нет.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from app.ai.cv_ml import extract_resume_text, normalize_text
from app.ai.embeddings import embed_text, embed_texts, to_pgvector
from app.exceptions import EDSServiceException
from db import database


class MatchingService:
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

    async def _load_resume(self, conn, candidate_id: str, resume_id: Optional[str]) -> dict:
        if resume_id:
            row = await conn.fetchrow(
                """
                SELECT id, original_filename, file_path, file_url
                FROM resumes
                WHERE id = $1::uuid AND candidate_id = $2::uuid
                """,
                resume_id, candidate_id,
            )
        else:
            row = await conn.fetchrow(
                """
                SELECT id, original_filename, file_path, file_url
                FROM resumes
                WHERE candidate_id = $1::uuid
                ORDER BY is_primary DESC, uploaded_at DESC
                LIMIT 1
                """,
                candidate_id,
            )
        if not row:
            raise EDSServiceException(
                code="RESUME_NOT_FOUND",
                message_ru="Резюме не найдено",
                message_kz="Түйіндеме табылмады",
                message_en="Resume not found",
            )
        return dict(row)

    async def _resume_text(self, resume: dict) -> str:
        from app.storage import storage

        url_path = resume.get("file_path") or resume.get("file_url") or ""
        if not url_path:
            raise EDSServiceException(
                code="RESUME_FILE_NOT_FOUND",
                message_ru="Файл резюме не найден",
                message_kz="Түйіндеме файлы табылмады",
                message_en="Resume file not found",
            )
        try:
            content = await storage.read(url_path)
        except Exception:
            raise EDSServiceException(
                code="RESUME_FILE_NOT_FOUND",
                message_ru="Файл резюме не найден",
                message_kz="Түйіндеме файлы табылмады",
                message_en="Resume file not found",
            )
        filename = resume.get("original_filename") or url_path.rsplit("/", 1)[-1]
        text = normalize_text(extract_resume_text(filename, content))
        if len(text.strip()) < 20:
            raise EDSServiceException(
                code="RESUME_TEXT_EMPTY",
                message_ru="Не удалось извлечь текст из резюме",
                message_kz="Түйіндемеден мәтін шығару мүмкін болмады",
                message_en="Could not extract text from this resume. Try a different file.",
            )
        return text

    @staticmethod
    def _job_text(row: dict) -> str:
        parts = [row.get("title"), row.get("description"), row.get("requirements")]
        return "\n".join(p for p in parts if p).strip()

    async def _ensure_job_embeddings(self, conn) -> None:
        """Досчитывает эмбеддинги для опубликованных вакансий, у которых их ещё нет."""
        missing = await conn.fetch(
            """
            SELECT id, title, description, requirements
            FROM job_postings
            WHERE status = 'published' AND embedding IS NULL
            """
        )
        if not missing:
            return
        texts = [self._job_text(dict(r)) for r in missing]
        vectors = await asyncio.to_thread(embed_texts, texts)
        for row, vector in zip(missing, vectors):
            await conn.execute(
                "UPDATE job_postings SET embedding = $1::vector WHERE id = $2::uuid",
                to_pgvector(vector), str(row["id"]),
            )

    async def match_jobs_for_resume(
        self, user_id: str, resume_id: Optional[str], limit: int = 10
    ) -> dict:
        """Главный сценарий: резюме → вектор → топ подходящих вакансий по смыслу."""
        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            resume = await self._load_resume(conn, candidate_id, resume_id)

        text = await self._resume_text(resume)
        resume_vector = await asyncio.to_thread(embed_text, text)
        vector_literal = to_pgvector(resume_vector)

        async with database.db_pool.acquire() as conn:
            await self._ensure_job_embeddings(conn)
            rows = await conn.fetch(
                """
                SELECT jp.id, jp.title, jp.description, jp.location, jp.is_remote,
                       jp.employment_type, jp.salary_min, jp.salary_max, jp.currency,
                       jp.published_at, rp.company_name,
                       1 - (jp.embedding <=> $1::vector) AS similarity
                FROM job_postings jp
                JOIN recruiter_profiles rp ON rp.id = jp.recruiter_id
                WHERE jp.status = 'published' AND jp.embedding IS NOT NULL
                ORDER BY jp.embedding <=> $1::vector
                LIMIT $2
                """,
                vector_literal, limit,
            )

        jobs = []
        for r in rows:
            item = dict(r)
            similarity = float(item.pop("similarity") or 0.0)
            # Косинусная близость [-1..1] → проценты [0..100].
            item["match_score"] = round(max(0.0, min(1.0, similarity)) * 100, 1)
            jobs.append(item)

        return {
            "resume_id": str(resume["id"]),
            "resume_filename": resume.get("original_filename"),
            "count": len(jobs),
            "jobs": jobs,
        }
