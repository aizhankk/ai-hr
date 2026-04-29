from typing import Optional
from pydantic import BaseModel


class AddJobSkillRequest(BaseModel):
    skill_name: str
    level: Optional[str] = None  # beginner | intermediate | advanced | expert
    is_required: bool = True