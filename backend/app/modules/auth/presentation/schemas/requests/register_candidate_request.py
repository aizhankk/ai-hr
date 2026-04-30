from pydantic import BaseModel, Field, field_validator


class RegisterCandidateRequest(BaseModel):
    email: str
    password: str = Field(min_length=4, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
