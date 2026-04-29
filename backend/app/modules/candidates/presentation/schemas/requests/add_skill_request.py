from typing import Optional
from pydantic import BaseModel


class AddSkillRequest(BaseModel):
    skill_name: str
    level: Optional[str] = None  # beginner | intermediate | advanced | expert
    years_experience: Optional[int] = None