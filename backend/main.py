from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

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
app.add_middleware(AuthMiddleware)
app.include_router(main_router)


@app.exception_handler(EDSServiceException)
async def handle_eds_exception(_: Request, exc: EDSServiceException):
    return JSONResponse(status_code=401, content=exc.body)

@app.get("/")
def home():
    return {"message": "Hello FastAPI"}