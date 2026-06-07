import os
import uuid
from pathlib import Path

import httpx

from app.storage.base import StorageBackend

_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
_BUCKET = os.getenv("SUPABASE_BUCKET", "aihr-uploads")


class SupabaseStorage(StorageBackend):
    """Хранилище через Supabase Storage REST API. Bucket должен быть public."""

    def __init__(self) -> None:
        if not _SUPABASE_URL or not _SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for SupabaseStorage"
            )
        self.bucket = _BUCKET
        self.base = _SUPABASE_URL
        self.headers = {
            "Authorization": f"Bearer {_SERVICE_KEY}",
            "apikey": _SERVICE_KEY,
        }

    def _content_type(self, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        return {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }.get(ext, "application/octet-stream")

    async def save(self, content: bytes, filename: str, folder: str) -> tuple:
        file_uuid = str(uuid.uuid4())
        ext = Path(filename).suffix or ""
        key = f"{folder}/{file_uuid}{ext}"
        url = f"{self.base}/storage/v1/object/{self.bucket}/{key}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                url,
                content=content,
                headers={
                    **self.headers,
                    "Content-Type": self._content_type(filename),
                    "x-upsert": "true",
                },
            )
            resp.raise_for_status()
        return file_uuid, key

    async def read(self, url_path: str) -> bytes:
        key = url_path.lstrip("/")
        if key.startswith("http"):
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(key)
                resp.raise_for_status()
                return resp.content
        url = f"{self.base}/storage/v1/object/{self.bucket}/{key}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.content

    async def delete(self, url_path: str) -> None:
        key = url_path.lstrip("/")
        url = f"{self.base}/storage/v1/object/{self.bucket}/{key}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                await client.delete(url, headers=self.headers)
            except Exception:
                pass

    def public_url(self, url_path: str) -> str:
        if url_path.startswith("http"):
            return url_path
        key = url_path.lstrip("/")
        return f"{self.base}/storage/v1/object/public/{self.bucket}/{key}"
