from pydantic import BaseModel, Field


class ForgotPasswordConfirmRequest(BaseModel):
    email: str
    code: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=8, max_length=128)
