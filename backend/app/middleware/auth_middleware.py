import logging
from hashlib import sha256

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.exceptions import EDSServiceException
from db import database

logger = logging.getLogger(__name__)

EXCLUDE_PATHS = {"/", "/docs", "/openapi.json", "/redoc", "/health"}
PUBLIC_PREFIXES = (
    "/api/auth/register/candidate",
    "/api/auth/register/recruiter",
    "/api/auth/verify-email",
    "/api/auth/resend-code",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/forgot-password/request-code",
    "/api/auth/forgot-password/confirm",
)


def _ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "-"


def _log(level: str, msg: str, request: Request, **kw):
    payload = {
        "_msg": msg,
        "path": request.url.path,
        "method": request.method,
        "ip": _ip(request),
    }
    payload.update(kw)
    log_fn = logger.info if level == "info" else logger.warning
    log_fn(msg, extra=payload)


def _unauthorized_response(exc: EDSServiceException) -> JSONResponse:
    return JSONResponse(status_code=401, content=exc.body)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Keep the field for dependencies that expect it.
        request.state.db = None
        request.state.user_id = None

        path = request.url.path.rstrip("/") or "/"
        if (
            request.method == "OPTIONS"
            or path in EXCLUDE_PATHS
            or path.startswith(PUBLIC_PREFIXES)
        ):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            _log("warn", "auth_missing_header", request)
            return _unauthorized_response(
                EDSServiceException(
                    code="AUTH_MISSING_HEADER",
                    message_ru="Отсутствует заголовок авторизации",
                    message_kz="Авторизация тақырыпшасы жоқ",
                    message_en="Missing authorization header",
                )
            )

        scheme, _, value = auth_header.partition(" ")
        token = value.strip() if scheme.lower() == "bearer" else ""
        if not token:
            _log("warn", "auth_empty_or_invalid_token", request)
            return _unauthorized_response(
                EDSServiceException(
                    code="AUTH_EMPTY_TOKEN",
                    message_ru="Пустой или некорректный токен авторизации",
                    message_kz="Бос немесе қате авторизация токені",
                    message_en="Empty or invalid authorization token",
                )
            )

        token_sig = sha256(token.encode()).hexdigest()[:12]
        pool = database.db_pool
        if pool is None:
            logger.error("db_pool is not initialized")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "code": "DB_POOL_NOT_INITIALIZED",
                    "message": [
                        {"lang": "ru", "name": "База данных недоступна"},
                        {"lang": "kz", "name": "Дерекқор қолжетімсіз"},
                        {"lang": "en", "name": "Database is unavailable"},
                    ],
                    "errors": [],
                    "data": {},
                },
            )

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT user_id FROM aihr.user_sessions "
                "WHERE session_token = $1 "
                "  AND is_active = TRUE "
                "  AND revoked_at IS NULL "
                "  AND expires_at > NOW() "
                "LIMIT 1",
                token,
            )
            if not row:
                _log("warn", "auth_invalid_session", request, token_sig=token_sig)
                return _unauthorized_response(
                    EDSServiceException(
                        code="UNAUTHORIZED",
                        message_ru="Недействительная сессия",
                        message_kz="Жарамсыз сессия",
                        message_en="Invalid session",
                    )
                )

            user_id = str(row["user_id"])
            await conn.execute(
                "SELECT set_config('my.current_user_id', $1, false);", user_id
            )
            request.state.db = conn
            request.state.user_id = user_id
            _log("info", "auth_ok", request, user_id=user_id)
            return await call_next(request)
