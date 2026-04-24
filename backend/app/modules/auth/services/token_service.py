import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt

from app.exceptions import EDSServiceException


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    refresh_expires_at: datetime


class TokenService:
    def __init__(self) -> None:
        self.jwt_secret = os.getenv("JWT_SECRET", "change-me-in-production")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_ttl_minutes = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "30"))
        self.refresh_ttl_days = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "14"))

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _encode(self, *, user_id: str, email: str, role: str, typ: str, ttl: timedelta) -> str:
        exp = self._now() + ttl
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": typ,
            "exp": int(exp.timestamp()),
            "iat": int(self._now().timestamp()),
            "jti": secrets.token_hex(16),
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def create_pair(self, *, user_id: str, email: str, role: str) -> TokenPair:
        refresh_expires_at = datetime.utcnow() + timedelta(days=self.refresh_ttl_days)
        return TokenPair(
            access_token=self._encode(
                user_id=user_id,
                email=email,
                role=role,
                typ="access",
                ttl=timedelta(minutes=self.access_ttl_minutes),
            ),
            refresh_token=self._encode(
                user_id=user_id,
                email=email,
                role=role,
                typ="refresh",
                ttl=timedelta(days=self.refresh_ttl_days),
            ),
            refresh_expires_at=refresh_expires_at,
        )

    def decode(self, token: str) -> dict:
        try:
            return jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
        except jwt.ExpiredSignatureError:
            raise EDSServiceException(
                code="TOKEN_EXPIRED",
                message_ru="Токен истек",
                message_kz="Токен мерзімі аяқталды",
                message_en="Token expired",
            )
        except jwt.InvalidTokenError:
            raise EDSServiceException(
                code="TOKEN_INVALID",
                message_ru="Некорректный токен",
                message_kz="Қате токен",
                message_en="Invalid token",
            )
