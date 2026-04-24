from pydantic import BaseModel, Field, field_validator


class RegisterCandidateRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must contain at least one digit.")
        if not any(ch.isalpha() for ch in value):
            raise ValueError("Password must contain at least one letter.")
        return value
