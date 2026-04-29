import io
import os
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.storage.base import StorageBackend

_ENDPOINT = os.getenv("SPACES_ENDPOINT", "")          # e.g. https://fra1.digitaloceanspaces.com
_KEY      = os.getenv("SPACES_KEY", "")
_SECRET   = os.getenv("SPACES_SECRET", "")
_BUCKET   = os.getenv("SPACES_BUCKET", "aihr")
_REGION   = os.getenv("SPACES_REGION", "fra1")
_PUBLIC   = os.getenv("SPACES_PUBLIC_URL", "")        # e.g. https://aihr.fra1.digitaloceanspaces.com


class SpacesStorage(StorageBackend):
    def __init__(self) -> None:
        self.bucket = _BUCKET
        self.public_base = _PUBLIC.rstrip("/")
        self.s3 = boto3.client(
            "s3",
            region_name=_REGION,
            endpoint_url=_ENDPOINT,
            aws_access_key_id=_KEY,
            aws_secret_access_key=_SECRET,
        )

    async def save(self, content: bytes, filename: str, folder: str) -> tuple:
        file_uuid = str(uuid.uuid4())
        ext = Path(filename).suffix or ""
        key = f"{folder}/{file_uuid}{ext}"
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ACL="public-read",
        )
        return file_uuid, key

    async def read(self, url_path: str) -> bytes:
        key = url_path.lstrip("/")
        resp = self.s3.get_object(Bucket=self.bucket, Key=key)
        return resp["Body"].read()

    async def delete(self, url_path: str) -> None:
        key = url_path.lstrip("/")
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
        except ClientError:
            pass

    def public_url(self, url_path: str) -> str:
        key = url_path.lstrip("/")
        return f"{self.public_base}/{key}"
