from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class CreateApplicationRequest(BaseModel):
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
    cover_letter: Optional[str] = None