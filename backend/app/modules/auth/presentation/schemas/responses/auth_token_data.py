from datetime import datetime

from pydantic import BaseModel


class AuthTokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    refresh_expires_at: datetime
