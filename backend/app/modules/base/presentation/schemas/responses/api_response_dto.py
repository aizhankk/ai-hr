from typing import Any, List, Optional

from pydantic import BaseModel


class MessageDTO(BaseModel):
    lang: str
    name: str


class ErrorDTO(BaseModel):
    message: str
    message_ru: Optional[str] = None
    message_kz: Optional[str] = None
    message_en: Optional[str] = None


class ApiResponseDTO(BaseModel):
    status: str
    code: str
    message: List[MessageDTO]
    errors: List[ErrorDTO]
    data: Any
