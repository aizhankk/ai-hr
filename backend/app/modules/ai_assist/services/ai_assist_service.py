import asyncio
import os
from typing import Optional

from app.exceptions import EDSServiceException
from db import database


class AiAssistService:
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

    async def _load_job(self, conn, job_posting_id: str) -> dict:
        row = await conn.fetchrow(
            """
            SELECT id, title, description, requirements
            FROM job_postings
            WHERE id = $1::uuid
            """,
            job_posting_id,
        )
        if not row:
            raise EDSServiceException(
                code="JOB_NOT_FOUND",
                message_ru="Вакансия не найдена",
                message_kz="Вакансия табылмады",
                message_en="Job not found",
            )
        return dict(row)

    async def _load_resume_for_candidate(
        self, conn, candidate_id: str, resume_id: Optional[str]
    ) -> dict:
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
                WHERE candidate_id = $1::uuid AND is_primary = TRUE
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

    async def _read_resume_bytes(self, resume: dict) -> tuple[str, bytes]:
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
        return filename, content

    async def match_preview(
        self, user_id: str, job_posting_id: str, resume_id: Optional[str]
    ) -> dict:
        """Run AI match analysis between a candidate's resume and a job, without persisting."""
        from app.ai.cv_ml import rank_resumes_against_job

        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            job = await self._load_job(conn, job_posting_id)
            resume = await self._load_resume_for_candidate(conn, candidate_id, resume_id)

        filename, content = await self._read_resume_bytes(resume)
        job_description = job.get("description") or job.get("title") or ""
        if job.get("requirements"):
            job_description = f"{job_description}\n\nRequirements:\n{job['requirements']}"

        results = await asyncio.to_thread(
            rank_resumes_against_job, job_description, [(filename, content)]
        )
        result = results[0] if results else {}
        return {
            "matching_score": result.get("match_score", 0.0),
            "skill_overlap": result.get("skill_overlap", 0.0),
            "semantic_score": result.get("semantic_score", 0.0),
            "experience_years": result.get("experience_years", 0),
            "education": result.get("education", ""),
            "skills_matched": result.get("skills", []),
            "summary": (result.get("preview", "") or "")[:500],
            "resume_id": str(resume["id"]),
            "resume_filename": resume.get("original_filename"),
        }

    async def chat(
        self,
        user_id: str,
        messages: list[dict],
        job_posting_id: Optional[str],
        resume_id: Optional[str],
    ) -> dict:
        """Answer candidate questions about their CV and the job."""
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise EDSServiceException(
                code="OPENAI_NOT_CONFIGURED",
                message_ru="OPENAI_API_KEY не настроен",
                message_kz="OPENAI_API_KEY орнатылмаған",
                message_en="OpenAI API key is not configured",
            )

        job: Optional[dict] = None
        resume_text: Optional[str] = None

        async with database.db_pool.acquire() as conn:
            candidate_id = await self._candidate_id(conn, user_id)
            if job_posting_id:
                job = await self._load_job(conn, job_posting_id)
            if resume_id is not None or job_posting_id:
                # Best-effort load resume (use specified, or primary)
                try:
                    resume = await self._load_resume_for_candidate(
                        conn, candidate_id, resume_id
                    )
                except EDSServiceException:
                    resume = None
            else:
                resume = None

        if resume:
            try:
                from app.ai.cv_ml import extract_resume_text, normalize_text
                filename, content = await self._read_resume_bytes(resume)
                resume_text = normalize_text(extract_resume_text(filename, content))[:8000]
            except Exception:
                resume_text = None

        system_parts = [
            "You are a helpful career assistant for a job candidate. "
            "Answer clearly and concisely (2-5 short paragraphs max). "
            "Help the candidate understand a job description and how their CV fits it. "
            "Be honest about gaps but constructive; suggest concrete improvements when relevant. "
            "Reply in the same language the candidate uses."
        ]
        if job:
            system_parts.append(
                f"JOB TITLE: {job.get('title') or ''}\n"
                f"JOB DESCRIPTION:\n{(job.get('description') or '')[:4000]}\n"
                f"REQUIREMENTS:\n{(job.get('requirements') or '')[:2000]}"
            )
        if resume_text:
            system_parts.append(f"CANDIDATE CV (extracted text):\n{resume_text}")

        system_prompt = "\n\n".join(system_parts)

        chat_messages = [{"role": "system", "content": system_prompt}]
        for m in messages[-12:]:
            role = m.get("role")
            content = (m.get("content") or "").strip()
            if role in {"user", "assistant"} and content:
                chat_messages.append({"role": role, "content": content[:4000]})

        try:
            from openai import OpenAI
        except Exception:
            raise EDSServiceException(
                code="OPENAI_SDK_MISSING",
                message_ru="OpenAI SDK недоступен",
                message_kz="OpenAI SDK қол жетімсіз",
                message_en="OpenAI SDK is not installed",
            )

        model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)

        def _call() -> str:
            response = client.chat.completions.create(
                model=model,
                messages=chat_messages,
                temperature=0.4,
            )
            choice = response.choices[0] if response.choices else None
            return (choice.message.content if choice and choice.message else "") or ""

        try:
            reply = await asyncio.to_thread(_call)
        except Exception as exc:
            raise EDSServiceException(
                code="AI_CHAT_FAILED",
                message_ru="Не удалось получить ответ ИИ",
                message_kz="ИИ жауабын алу сәтсіз аяқталды",
                message_en=f"AI chat failed: {exc}",
            )

        return {"reply": reply.strip()}
