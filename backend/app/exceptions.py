from app.modules.base.presentation.schemas.responses.api_response_dto import (
    ErrorDTO,
    MessageDTO,
)


class ServiceError(Exception):
    def __init__(self, status_id: int):
        super().__init__(f"ServiceError status_id={status_id}")
        self.status_id = status_id


class EDSServiceException(Exception):
    def __init__(
        self,
        code: str,
        message_ru: str,
        message_kz: str,
        message_en: str,
        errors: list = None,
    ):
        self.code = code
        self.message_ru = message_ru
        self.message_kz = message_kz
        self.message_en = message_en
        self.errors = errors or []
        self.body = {
            "status": "error",
            "code": code,
            "message": [
                MessageDTO(lang="ru", name=message_ru).model_dump(),
                MessageDTO(lang="kz", name=message_kz).model_dump(),
                MessageDTO(lang="en", name=message_en).model_dump(),
            ],
            "errors": [ErrorDTO(message=str(e)).model_dump() for e in self.errors],
            "data": {},
        }
        super().__init__(self.message_ru)
