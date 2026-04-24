import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DB_NAME = os.getenv("DB_NAME", default="postgres")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", default="5432")
DB_USER = os.getenv("DB_USER", default="postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", default="postgres")
MAX_POOL_SIZE = os.getenv("MAX_POOL_SIZE", default="200")
