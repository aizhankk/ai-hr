from fastapi import APIRouter, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.auth.presentation.schemas.requests import (
    ForgotPasswordCodeRequest,
    ForgotPasswordConfirmRequest,
    LoginRequest,
    RefreshRequest,
    RegisterCandidateRequest,
    RegisterRecruiterRequest,
)
from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeEmailRequestBody(BaseModel):
    new_email: str

class ChangeEmailConfirmBody(BaseModel):
    new_email: str
    code: str
from app.modules.auth.services.auth_service import AuthService

auth_router = APIRouter(prefix="/auth", tags=["Auth"])
auth_service = AuthService()
bearer_scheme = HTTPBearer()


def _raise_registration_error(exc: EDSServiceException) -> None:
    detail = exc.message_en
    code = exc.code
    if code == "EMAIL_ALREADY_EXISTS":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    if code == "EMAIL_SEND_FAILED":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    if code == "CODE_EXPIRED":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=detail)
    if code in {"CODE_INVALID", "CODE_NOT_FOUND"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


@auth_router.post("/register/candidate", status_code=status.HTTP_201_CREATED)
async def register_candidate(payload: RegisterCandidateRequest):
    import re
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    try:
        token_pair, user = await auth_service.register_candidate(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
    except EDSServiceException as exc:
        _raise_registration_error(exc)
    return {
        "status": "success",
        "data": {
            "access_token": token_pair.access_token,
            "refresh_token": token_pair.refresh_token,
            "token_type": "bearer",
            "refresh_expires_at": token_pair.refresh_expires_at.isoformat(),
            "user": {"id": str(user["id"]), "email": user["email"], "role": str(user["role"])},
        },
    }


@auth_router.post("/register/recruiter", status_code=status.HTTP_201_CREATED)
async def register_recruiter(payload: RegisterRecruiterRequest):
    import re
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    try:
        token_pair, user = await auth_service.register_recruiter(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name,
            last_name=payload.last_name,
            company_name=payload.company_name,
            position=payload.position,
        )
    except EDSServiceException as exc:
        _raise_registration_error(exc)
    return {
        "status": "success",
        "data": {
            "access_token": token_pair.access_token,
            "refresh_token": token_pair.refresh_token,
            "token_type": "bearer",
            "refresh_expires_at": token_pair.refresh_expires_at.isoformat(),
            "user": {"id": str(user["id"]), "email": user["email"], "role": str(user["role"])},
        },
    }


@auth_router.post("/login")
async def login_user(payload: LoginRequest):
    try:
        token_pair = await auth_service.login(payload.email, payload.password)
    except EDSServiceException as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message_en)
    return {
        "status": "success",
        "code": "LOGIN_OK",
        "message": "Login successful",
        "data": {
            "access_token": token_pair.access_token,
            "refresh_token": token_pair.refresh_token,
            "token_type": "bearer",
            "refresh_expires_at": token_pair.refresh_expires_at.isoformat(),
        },
    }


@auth_router.post("/refresh")
async def refresh_tokens(payload: RefreshRequest):
    try:
        token_pair = await auth_service.refresh(payload.refresh_token)
    except EDSServiceException as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message_en)
    return {
        "status": "success",
        "code": "REFRESH_OK",
        "message": "Tokens refreshed",
        "data": {
            "access_token": token_pair.access_token,
            "refresh_token": token_pair.refresh_token,
            "token_type": "bearer",
            "refresh_expires_at": token_pair.refresh_expires_at.isoformat(),
        },
    }


@auth_router.post("/forgot-password/request-code")
async def forgot_password_request_code(payload: ForgotPasswordCodeRequest):
    try:
        await auth_service.request_forgot_code(payload.email)
    except EDSServiceException as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message_en)
    return {
        "status": "success",
        "code": "FORGOT_PASSWORD_CODE_SENT",
        "message": "Verification code sent to email",
        "data": {"email": payload.email},
    }


@auth_router.post("/forgot-password/confirm")
async def forgot_password_confirm(payload: ForgotPasswordConfirmRequest):
    await auth_service.confirm_forgot_password(
        payload.email, payload.code, payload.new_password
    )
    return {
        "status": "success",
        "code": "PASSWORD_RESET_OK",
        "message": "Password changed successfully",
        "data": {"email": payload.email},
    }


@auth_router.get("/me")
async def me(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user_id = getattr(request.state, "user_id", None)
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header else ""
    payload = auth_service.decode_token(token) if token else {}
    return {
        "status": "success",
        "code": "ME_OK",
        "message": "Current user profile",
        "data": {
            "user_id": user_id or payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
        },
    }


@auth_router.get("/users")
async def get_users(_: HTTPAuthorizationCredentials = Security(bearer_scheme)):
    users = await auth_service.get_all_users()
    return {
        "status": "success",
        "code": "USERS_OK",
        "message": "Users list",
        "data": users,
    }


@auth_router.post("/change-email/request", status_code=status.HTTP_200_OK)
async def change_email_request(
    payload: ChangeEmailRequestBody,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await auth_service.request_email_change(request.state.user_id, payload.new_email)
    except EDSServiceException as exc:
        http_status = status.HTTP_409_CONFLICT if exc.code == "EMAIL_ALREADY_EXISTS" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return {"status": "success", "code": "EMAIL_CHANGE_CODE_SENT", "message": "Verification code sent to new email"}


@auth_router.post("/change-email/confirm", status_code=status.HTTP_200_OK)
async def change_email_confirm(
    payload: ChangeEmailConfirmBody,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await auth_service.confirm_email_change(request.state.user_id, payload.new_email, payload.code)
    except EDSServiceException as exc:
        code = exc.code
        http_status = (
            status.HTTP_410_GONE if code == "CODE_EXPIRED"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return {"status": "success", "code": "EMAIL_CHANGED", "message": "Email updated. Please log in again."}


@auth_router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    try:
        await auth_service.change_password(
            request.state.user_id,
            payload.current_password,
            payload.new_password,
        )
    except EDSServiceException as exc:
        code = exc.code
        http_status = status.HTTP_400_BAD_REQUEST if code == "INVALID_CURRENT_PASSWORD" else status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return {"status": "success", "code": "PASSWORD_CHANGED", "message": "Password changed successfully"}


@auth_router.post("/logout")
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    token = credentials.credentials.strip() if credentials else ""
    if token:
        await auth_service.logout(token)
    return {
        "status": "success",
        "code": "LOGOUT_OK",
        "message": "Logged out",
        "data": {},
    }
