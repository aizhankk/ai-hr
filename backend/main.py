import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.exceptions import EDSServiceException
from app.middleware.auth_middleware import AuthMiddleware
from app.presentation.main_controller import main_router
from db.database import close_db_pool, init_db_pool


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db_pool()
    try:
        yield
    finally:
        await close_db_pool()


app = FastAPI(
    title="PythonProject API",
    description="API documentation for hr-AI backend",
    lifespan=lifespan,
)

_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"http://\d+\.\d+\.\d+\.\d+:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)
app.include_router(main_router)

# Раздача загруженных файлов — /media/resumes/*, /media/videos/*
_media_root = Path(os.getenv("MEDIA_ROOT", "media")).resolve()
_media_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_media_root)), name="media")


@app.exception_handler(EDSServiceException)
async def handle_eds_exception(_: Request, exc: EDSServiceException):
    return JSONResponse(status_code=401, content=exc.body)

@app.get("/")
def home():
    return {"message": "Hello FastAPI"}