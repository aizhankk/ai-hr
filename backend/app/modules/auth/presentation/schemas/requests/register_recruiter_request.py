from pydantic import BaseModel, Field, field_validator


class RegisterRecruiterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    company_name: str = Field(min_length=1, max_length=255)
    position: str = Field(min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must contain at least one digit.")
        if not any(ch.isalpha() for ch in value):
            raise ValueError("Password must contain at least one letter.")
        return value
