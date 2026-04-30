from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class MatchPreviewRequest(BaseModel):
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
