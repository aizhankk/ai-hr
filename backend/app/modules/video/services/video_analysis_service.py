import asyncio
import json
import os
import subprocess
import tempfile

import httpx

from app.exceptions import EDSServiceException
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
                message_en="OpenAI API key is not configured",
            )
        from openai import OpenAI
        return OpenAI(api_key=self.api_key)

    async def analyze(self, application_id: str, recruiter_user_id: str) -> dict:
        # --- 1. Load job info + video record from DB ---
        async with database.db_pool.acquire() as conn:
            app = await conn.fetchrow(
                """
                SELECT jp.title, jp.description, jp.requirements
                FROM applications a
                JOIN job_postings jp        ON jp.id = a.job_posting_id
                JOIN recruiter_profiles rp  ON rp.id = jp.recruiter_id
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

        video_url: str = video["video_url"]

        if not video_url.startswith("http"):
            raise EDSServiceException(
                code="VIDEO_URL_INVALID",
                message_ru="Пожалуйста, загрузите видео повторно",
                message_kz="Бейнені қайта жүктеңіз",
                message_en="Please re-upload the video — it was saved before cloud storage was configured",
            )

        # --- 2. Download video bytes ---
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=180.0, write=30.0, pool=5.0)) as client:
                resp = await client.get(video_url)
                resp.raise_for_status()
                video_bytes = resp.content
        except Exception:
            raise EDSServiceException(
                code="VIDEO_DOWNLOAD_FAILED",
                message_ru="Не удалось загрузить видеофайл",
                message_kz="Бейне файлды жүктеу сәтсіз аяқталды",
                message_en="Failed to download video file",
            )

        original_filename = video_url.rsplit("/", 1)[-1]
        job_title = app["title"] or "this position"
        job_desc = "\n".join(filter(None, [app["description"], app["requirements"]])).strip()

        # --- 3. Run blocking work (ffmpeg + Whisper + GPT) in a thread ---
        result = await asyncio.to_thread(
            self._run_analysis_sync,
            video_bytes,
            original_filename,
            job_title,
            job_desc,
        )

        # --- 4. Save to DB ---
        async with database.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO video_analyses
                    (video_interview_id,
                     speech_clarity_score, confidence_score, emotional_tone_score, overall_score,
                     speech_transcript, ai_summary, recommendations,
                     verdict, strengths, concerns,
                     analyzed_at)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, NOW())
                ON CONFLICT (video_interview_id) DO UPDATE
                    SET speech_clarity_score = EXCLUDED.speech_clarity_score,
                        confidence_score     = EXCLUDED.confidence_score,
                        emotional_tone_score = EXCLUDED.emotional_tone_score,
                        overall_score        = EXCLUDED.overall_score,
                        speech_transcript    = EXCLUDED.speech_transcript,
                        ai_summary           = EXCLUDED.ai_summary,
                        recommendations      = EXCLUDED.recommendations,
                        verdict              = EXCLUDED.verdict,
                        strengths            = EXCLUDED.strengths,
                        concerns             = EXCLUDED.concerns,
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
                result["verdict"],
                json.dumps(result["strengths"]),
                json.dumps(result["concerns"]),
            )
            return dict(row)

    def _run_analysis_sync(
        self,
        video_bytes: bytes,
        original_filename: str,
        job_title: str,
        job_desc: str,
    ) -> dict:
        client = self._get_client()
        ext = os.path.splitext(original_filename)[1].lower() or ".mp4"

        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = os.path.join(tmpdir, f"video{ext}")
            audio_path = os.path.join(tmpdir, "audio.mp3")

            with open(video_path, "wb") as f:
                f.write(video_bytes)

            proc = subprocess.run(
                [
                    "ffmpeg", "-i", video_path,
                    "-vn",
                    "-acodec", "libmp3lame",
                    "-ar", "16000",
                    "-ac", "1",
                    "-ab", "64k",
                    "-y",
                    audio_path,
                ],
                capture_output=True,
                timeout=120,
            )
            if proc.returncode != 0:
                raise EDSServiceException(
                    code="AUDIO_EXTRACTION_FAILED",
                    message_ru="Не удалось извлечь аудио из видео",
                    message_kz="Бейнеден аудио шығару сәтсіз аяқталды",
                    message_en="Failed to extract audio from video. Make sure the file is a valid video.",
                )

            with open(audio_path, "rb") as af:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=af,
                )

        transcript = (transcription.text or "").strip()

        if not transcript:
            raise EDSServiceException(
                code="TRANSCRIPTION_EMPTY",
                message_ru="В видео не обнаружена речь",
                message_kz="Бейнеде сөз табылмады",
                message_en="No speech detected in the video. Make sure the video has clear audio.",
            )

        job_context = f"Job Title: {job_title}"
        if job_desc:
            job_context += f"\nJob Description:\n{job_desc[:2000]}"

        prompt = f"""You are an expert recruitment analyst. Analyze the interview transcript below and assess the candidate's fit for the position.

{job_context}

Interview Transcript:
{transcript[:8000]}

Respond with ONLY a valid JSON object in exactly this format:
{{
  "verdict": "Good Fit",
  "overall_score": 82,
  "speech_clarity_score": 85,
  "confidence_score": 78,
  "emotional_tone_score": 80,
  "summary": "2-3 sentence overall assessment of the candidate's performance and fit.",
  "strengths": ["Strength one", "Strength two", "Strength three"],
  "concerns": ["Concern one", "Concern two"],
  "recommendations": "One sentence hiring recommendation."
}}

verdict must be exactly one of: "Good Fit", "Partial Fit", "Not a Fit".
All scores are integers 0-100. Return only the JSON, no markdown."""

        gpt_resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=700,
        )

        raw = (gpt_resp.choices[0].message.content or "").strip()

        # Strip markdown code fences if GPT wraps the response
        if "```" in raw:
            for block in raw.split("```"):
                block = block.strip().lstrip("json").strip()
                if block.startswith("{"):
                    raw = block
                    break

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}

        def clamp(v, default=70):
            try:
                return float(max(0, min(100, int(v))))
            except (TypeError, ValueError):
                return float(default)

        verdict = data.get("verdict", "Partial Fit")
        if verdict not in ("Good Fit", "Partial Fit", "Not a Fit"):
            verdict = "Partial Fit"

        return {
            "transcript": transcript,
            "verdict": verdict,
            "overall_score": clamp(data.get("overall_score")),
            "speech_clarity_score": clamp(data.get("speech_clarity_score")),
            "confidence_score": clamp(data.get("confidence_score")),
            "emotional_tone_score": clamp(data.get("emotional_tone_score")),
            "summary": str(data.get("summary", "")),
            "strengths": data.get("strengths", []) if isinstance(data.get("strengths"), list) else [],
            "concerns": data.get("concerns", []) if isinstance(data.get("concerns"), list) else [],
            "recommendations": str(data.get("recommendations", "")),
        }
