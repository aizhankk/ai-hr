from pydantic import BaseModel


class ResendCodeRequest(BaseModel):
    email: str
