from pydantic import BaseModel


class UpdateStatusRequest(BaseModel):
    status: str  # pending | reviewing | shortlisted | interview_scheduled | rejected | hired