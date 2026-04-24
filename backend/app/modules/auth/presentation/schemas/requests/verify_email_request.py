from pydantic import BaseModel, Field


class VerifyEmailRequest(BaseModel):
    email: str
    code: str = Field(min_length=4, max_length=10)
