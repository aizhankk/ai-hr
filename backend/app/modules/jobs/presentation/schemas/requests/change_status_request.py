from pydantic import BaseModel


class ChangeStatusRequest(BaseModel):
    status: str  # draft | published | paused | closed