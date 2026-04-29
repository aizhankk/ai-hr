import os
from pathlib import Path

from app.exceptions import EDSServiceException
from app.storage.local_storage import MEDIA_ROOT
from db import database


class VideoAnalysisService:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    def _get_client(self):
        if not self.api_key:
            raise EDSServiceException(
                code="OPENAI_NOT_CONFIGURED",
                message_ru="OPENAI_API_KEY не настроен",
                message_kz="OPENAI_API_KEY орнатылмаған",
                message_en="OPENAI_API_KEY is not configured",
            )
        from openai import OpenAI
        return OpenAI(api_key=self.api_key)

    async def analyze(self, application_id: str, recruiter_user_id: str) -> dict:
        import asyncio

        async with database.db_pool.acquire() as conn:
            # Проверяем доступ рекрутера
            app = await conn.fetchrow(
                """
                SELECT a.job_posting_id, jp.title, jp.description, jp.requirements
                FROM applications a
                JOIN job_postings jp    ON jp.id = a.job_posting_id
                JOIN recruiter_profiles rp ON rp.id = jp.recruiter_id
                WHERE a.id = $1::uuid AND rp.user_id = $2::uuid
                """,
                application_id, recruiter_user_id,
            )
            if not app:
                raise EDSServiceException(
                    code="APPLICATION_NOT_FOUND",
                    message_ru="Заявка не найдена или нет доступа",
                    message_kz="Өтініш табылмады немесе рұқсат жоқ",
                    message_en="Application not found or access denied",
                )

            video = await conn.fetchrow(
                "SELECT id, video_url FROM video_interviews WHERE application_id = $1::uuid",
                application_id,
            )
            if not video or not video["video_url"]:
                raise EDSServiceException(
                    code="VIDEO_NOT_FOUND",
                    message_ru="Видео не загружено",
                    message_kz="Бейне жүктелмеген",
                    message_en="No video uploaded for this application",
                )

        # Путь к файлу на диске
        video_url: str = video["video_url"]
        relative = video_url.lstrip("/").removeprefix("media/")
        file_path = MEDIA_ROOT / relative

        if not file_path.exists():
            raise EDSServiceException(
                code="VIDEO_FILE_NOT_FOUND",
                message_ru="Файл видео не найден на сервере",
                message_kz="Видео файлы серверде табылмады",
                message_en="Video file not found on server",
            )

        job_title = app["title"] or ""
        job_desc = f"{app['description'] or ''}\n{app['requirements'] or ''}".strip()

        # Запускаем в отдельном потоке чтобы не блокировать event loop
        result = await asyncio.to_thread(
            self._run_analysis, file_path, job_title, job_desc
        )

        # Сохраняем в video_analyses
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO video_analyses
                    (video_interview_id, speech_clarity_score, confidence_score,
                     emotional_tone_score, overall_score,
                     speech_transcript, ai_summary, recommendations, analyzed_at)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (video_interview_id) DO UPDATE
                    SET speech_clarity_score = EXCLUDED.speech_clarity_score,
                        confidence_score     = EXCLUDED.confidence_score,
                        emotional_tone_score = EXCLUDED.emotional_tone_score,
                        overall_score        = EXCLUDED.overall_score,
                        speech_transcript    = EXCLUDED.speech_transcript,
                        ai_summary           = EXCLUDED.ai_summary,
                        recommendations      = EXCLUDED.recommendations,
                        analyzed_at          = NOW()
                RETURNING *
                """,
                str(video["id"]),
                result["speech_clarity_score"],
                result["confidence_score"],
                result["emotional_tone_score"],
                result["overall_score"],
                result["transcript"],
                result["summary"],
                result["recommendations"],
            )
            return dict(row)

    def _run_analysis(self, file_path: Path, job_title: str, job_desc: str) -> dict:
        # TODO: заменить на реальный вызов Whisper + AI когда будет готово
        import random
        rng = random.Random(str(file_path))

        clarity   = rng.randint(68, 92)
        confidence = rng.randint(62, 88)
        tone      = rng.randint(70, 90)
        overall   = round((clarity * 0.35 + confidence * 0.35 + tone * 0.30), 1)

        return {
            "transcript": (
                f"Hello! My name is the candidate, and I'm excited about the opportunity to interview for the {job_title} position. "
                "I have approximately three years of experience in this field. "
                "I'm confident in my technical skills and eager to grow within your company. "
                "In my previous role, I successfully delivered projects both independently and as part of a team. "
                "I look forward to answering your questions."
            ),
            "speech_clarity_score": float(clarity),
            "confidence_score": float(confidence),
            "emotional_tone_score": float(tone),
            "overall_score": float(overall),
            "summary": (
                f"The candidate demonstrated clear and well-structured speech, confidently presenting their experience. "
                f"Responses align well with the requirements of the {job_title} position. "
                "Overall, the candidate made a strong positive impression during the interview."
            ),
            "recommendations": (
                "Consider providing more specific examples from past experience using the STAR method. "
                "Reduce the use of filler words to improve speech clarity and confidence. "
                "Elaborate more on technical competencies relevant to the role."
            ),
            "filler_words": ["um", "like", "you know"],
            "key_strengths": ["Clear speech structure", "Confident delivery", "Professional vocabulary"],
            "areas_to_improve": ["Concrete examples", "Speech pace", "Technical depth"],
        }