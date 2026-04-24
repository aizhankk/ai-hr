from typing import Optional

from pydantic import BaseModel


class ApiEnvelope(BaseModel):
    status: str = "success"
    code: str
    message: str
    data: Optional[dict] = None
