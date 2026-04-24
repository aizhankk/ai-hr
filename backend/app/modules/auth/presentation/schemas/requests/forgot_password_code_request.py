from pydantic import BaseModel


class ForgotPasswordCodeRequest(BaseModel):
    email: str
