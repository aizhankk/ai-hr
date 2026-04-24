from pydantic import BaseModel


class AuthUserData(BaseModel):
    user_id: str
    email: str
    role: str
