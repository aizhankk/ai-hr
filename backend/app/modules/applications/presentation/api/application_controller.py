from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.applications.presentation.schemas.requests.create_application_request import (
    CreateApplicationRequest,
)
from app.modules.applications.presentation.schemas.requests.update_status_request import (
    UpdateStatusRequest,
)
from app.modules.applications.services.application_service import ApplicationService

application_router = APIRouter(prefix="/applications", tags=["Applications"])
application_service = ApplicationService()
bearer_scheme = HTTPBearer()


def _ok(data):
    return {"status": "success", "data": data}


def _serial(row: dict) -> dict:
    result = {}
    for k, v in row.items():
        if hasattr(v, "hex"):
            result[k] = str(v)
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


@application_router.post("", status_code=status.HTTP_201_CREATED)
async def apply(
    payload: CreateApplicationRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        application = await application_service.apply(
            request.state.user_id,
            str(payload.job_posting_id),
            str(payload.resume_id) if payload.resume_id else None,
            payload.cover_letter,
        )
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(application))


@application_router.get("")
async def list_applications(
    request: Request,
    job_posting_id: Optional[str] = Query(None),
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    role = getattr(request.state, "user_role", None)
    try:
        if role == "recruiter":
            apps = await application_service.list_for_recruiter(
                request.state.user_id, job_posting_id
            )
        else:
            apps = await application_service.list_for_candidate(request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok([_serial(a) for a in apps])


@application_router.get("/{application_id}")
async def get_application(
    application_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    role = getattr(request.state, "user_role", "candidate")
    try:
        app = await application_service.get_application(
            application_id, request.state.user_id, role
        )
    except EDSServiceException as exc:
        code = exc.code
        http_status = 403 if code == "ACCESS_DENIED" else 404
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return _ok(_serial(app))


@application_router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_application(
    application_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    if getattr(request.state, "user_role", None) != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only")
    try:
        await application_service.withdraw(application_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)


@application_router.patch("/{application_id}/status")
async def update_status(
    application_id: str,
    payload: UpdateStatusRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        app = await application_service.update_status(
            application_id, request.state.user_id, payload.status
        )
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(app))


@application_router.get("/{application_id}/candidate")
async def get_candidate_profile(
    application_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """Полный профиль кандидата — только для рекрутера."""
    if getattr(request.state, "user_role", None) != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiters only")
    try:
        data = await application_service.get_candidate_profile(application_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)

    def serial(v):
        if isinstance(v, dict):
            return {k: serial(val) for k, val in v.items()}
        if isinstance(v, list):
            return [serial(i) for i in v]
        if hasattr(v, "hex"):
            return str(v)
        if hasattr(v, "isoformat"):
            return v.isoformat()
        return v

    return _ok(serial(data))


@application_router.post("/{application_id}/analyze", status_code=status.HTTP_200_OK)
async def analyze_resume(
    application_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """AI-анализ резюме кандидата против описания вакансии."""
    if getattr(request.state, "user_role", None) != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiters only")
    try:
        result = await application_service.analyze_resume(application_id, request.state.user_id)
    except EDSServiceException as exc:
        code = exc.code
        http_status = 404 if "NOT_FOUND" in code else 400
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return _ok(_serial(result))