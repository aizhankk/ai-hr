from typing import Optional
from pydantic import BaseModel


class UpdateRecruiterRequest(BaseModel):
    company_name: Optional[str] = None
    position: Optional[str] = None
    company_description: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None