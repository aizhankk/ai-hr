from typing import Optional
from pydantic import BaseModel, field_validator


class AddSkillRequest(BaseModel):
    skill_name: str
    level: Optional[str] = None  # beginner | intermediate | advanced | expert
    years_experience: Optional[int] = None

    @field_validator("level", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: object) -> object:
        return None if v == "" else v