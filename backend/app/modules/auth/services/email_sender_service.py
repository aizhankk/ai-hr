import asyncio
import logging
import os
import smtplib
from email.message import EmailMessage

from app.exceptions import EDSServiceException

logger = logging.getLogger(__name__)


class EmailSenderService:
    def __init__(self) -> None:
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from = os.getenv("SMTP_FROM", self.smtp_user or "no-reply@example.com")
        self.smtp_required = os.getenv("SMTP_REQUIRED", "false").lower() == "true"

        logger.info(
            "SMTP host='%s' port=%s user='%s' password_set=%s strict=%s",
            self.smtp_host,
            self.smtp_port,
            self.smtp_user,
            bool(self.smtp_password),
            self.smtp_required,
        )

    def _send_code_sync(self, email: str, code: str, purpose: str, ttl_minutes: int) -> None:
        msg = EmailMessage()
        msg["Subject"] = "Your verification code"
        msg["From"] = self.smtp_from
        msg["To"] = email
        msg.set_content(
            f"Your verification code: {code}\n"
            f"It expires in {ttl_minutes} minutes."
        )

        if self.smtp_port == 465:
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=10) as smtp:
                smtp.login(self.smtp_user, self.smtp_password)
                smtp.send_message(msg)
            return

        with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(self.smtp_user, self.smtp_password)
            smtp.send_message(msg)

    async def send_code(self, email: str, code: str, purpose: str, ttl_minutes: int) -> None:
        if not self.smtp_host or not self.smtp_user or not self.smtp_password:
            logger.warning(
                "SMTP not configured — code for %s (%s): %s", email, purpose, code
            )
            return

        try:
            await asyncio.to_thread(
                self._send_code_sync,
                email,
                code,
                purpose,
                ttl_minutes,
            )
        except Exception as exc:
            logger.exception("Email send failed for %s (%s)", email, purpose)
            if not self.smtp_required:
                logger.warning(
                    "SMTP unavailable, continue in non-strict mode; code for %s (%s): %s",
                    email,
                    purpose,
                    code,
                )
                return
            raise EDSServiceException(
                code="EMAIL_SEND_FAILED",
                message_ru="Не удалось отправить код на email",
                message_kz="Кодты email-ге жіберу сәтсіз аяқталды",
                message_en=f"Failed to send verification code: {exc}",
            )
