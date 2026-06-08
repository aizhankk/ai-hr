from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MatchJobsRequest(BaseModel):
    resume_id: Optional[UUID] = None
    limit: int = Field(default=10, ge=1, le=50)
