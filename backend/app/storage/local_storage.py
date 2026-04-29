import os
import uuid
from pathlib import Path

from app.storage.base import StorageBackend

# Корневая папка для файлов — переопределяется через MEDIA_ROOT
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "media")).resolve()
# Базовый URL для отдачи файлов (бэкенд обслуживает /media/*)
MEDIA_URL = os.getenv("MEDIA_URL", "/media")


class LocalStorage(StorageBackend):
    """Хранит файлы на локальном диске. Заменяется на MinioStorage без правок сервисов."""

    def _dest(self, folder: str, filename: str) -> Path:
        path = MEDIA_ROOT / folder
        path.mkdir(parents=True, exist_ok=True)
        return path / filename

    async def save(self, content: bytes, filename: str, folder: str) -> tuple:
        """
        Сохраняет файл.
        Возвращает (file_uuid: str, url_path: str).
          file_uuid → хранится в resumes.file_uuid (UUID)
          url_path  → хранится в resumes.file_path (VARCHAR) для скачивания
        """
        file_uuid = str(uuid.uuid4())
        ext = Path(filename).suffix or ""
        dest = self._dest(folder, f"{file_uuid}{ext}")
        dest.write_bytes(content)
        url_path = f"{MEDIA_URL}/{folder}/{file_uuid}{ext}"
        return file_uuid, url_path

    async def read(self, url_path: str) -> bytes:
        relative = url_path.removeprefix(MEDIA_URL).lstrip("/")
        return (MEDIA_ROOT / relative).read_bytes()

    async def delete(self, url_path: str) -> None:
        """Удаляет файл по url_path ('/media/resumes/uuid.pdf')."""
        relative = url_path.removeprefix(MEDIA_URL).lstrip("/")
        file_path = MEDIA_ROOT / relative
        file_path.unlink(missing_ok=True)

    def public_url(self, url_path: str) -> str:
        """Для локального хранилища url_path уже является публичным путём."""
        return url_path