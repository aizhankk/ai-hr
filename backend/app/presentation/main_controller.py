from fastapi import APIRouter

from app.modules.auth.presentation.api.auth_controller import auth_router

main_router = APIRouter(prefix="/api")

main_router.include_router(auth_router)

