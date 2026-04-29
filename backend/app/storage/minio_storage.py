"""
MinIO storage backend — будущая реализация.

Для подключения:
1. pip install minio
2. Добавить в .env:
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET=aihr
   MINIO_SECURE=false
3. В app/storage/__init__.py заменить:
   from app.storage.local_storage import LocalStorage
   storage = LocalStorage()
   на:
   from app.storage.minio_storage import MinioStorage
   storage = MinioStorage()
"""

# import io
# import os
# import uuid
# from pathlib import Path
# from minio import Minio
# from app.storage.base import StorageBackend
#
# class MinioStorage(StorageBackend):
#     def __init__(self) -> None:
#         self.client = Minio(
#             os.getenv("MINIO_ENDPOINT", "localhost:9000"),
#             access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
#             secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
#             secure=os.getenv("MINIO_SECURE", "false").lower() == "true",
#         )
#         self.bucket = os.getenv("MINIO_BUCKET", "aihr")
#         self.public_base = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000/aihr")
#
#     async def save(self, content: bytes, filename: str, folder: str) -> str:
#         ext = Path(filename).suffix or ""
#         key = f"{folder}/{uuid.uuid4()}{ext}"
#         self.client.put_object(self.bucket, key, io.BytesIO(content), len(content))
#         return key  # хранится в БД как object key
#
#     async def delete(self, url_path: str) -> None:
#         self.client.remove_object(self.bucket, url_path)
#
#     def public_url(self, url_path: str) -> str:
#         return f"{self.public_base}/{url_path}"