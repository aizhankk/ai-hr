from typing import Optional
from pydantic import BaseModel, field_validator


class AddJobSkillRequest(BaseModel):
    skill_name: str
    level: Optional[str] = None  # beginner | intermediate | advanced | expert
    is_required: bool = True

    @field_validator("level", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: object) -> object:
        return None if v == "" else v