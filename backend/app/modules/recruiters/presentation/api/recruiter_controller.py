from fastapi import APIRouter, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.recruiters.presentation.schemas.requests.update_recruiter_request import (
    UpdateRecruiterRequest,
)
from app.modules.recruiters.services.recruiter_service import RecruiterService

recruiter_router = APIRouter(prefix="/recruiters", tags=["Recruiters"])
recruiter_service = RecruiterService()
bearer_scheme = HTTPBearer()


def _ok(data):
    return {"status": "success", "data": data}


def _serial(row: dict) -> dict:
    return {k: str(v) if hasattr(v, "hex") else v for k, v in row.items()}


@recruiter_router.get("/me")
async def get_my_profile(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await recruiter_service.get_by_user_id(request.state.user_id)
    except EDSServiceException as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(profile))


@recruiter_router.put("/me")
async def update_my_profile(
    payload: UpdateRecruiterRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await recruiter_service.update(
            request.state.user_id, payload.model_dump(exclude_none=True)
        )
    except EDSServiceException as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(profile))