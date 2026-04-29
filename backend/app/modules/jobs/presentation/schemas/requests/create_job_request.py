from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class CreateJobRequest(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    employment_type: str = "full_time"
    location: Optional[str] = None
    is_remote: bool = False
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    currency: str = "USD"