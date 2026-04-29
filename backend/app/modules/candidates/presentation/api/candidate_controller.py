from fastapi import APIRouter, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.candidates.presentation.schemas.requests.add_skill_request import AddSkillRequest
from app.modules.candidates.presentation.schemas.requests.update_candidate_request import (
    UpdateCandidateRequest,
)
from app.modules.candidates.services.candidate_service import CandidateService

candidate_router = APIRouter(prefix="/candidates", tags=["Candidates"])
candidate_service = CandidateService()
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


@candidate_router.get("/me")
async def get_my_profile(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await candidate_service.get_by_user_id(request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(profile))


@candidate_router.put("/me")
async def update_my_profile(
    payload: UpdateCandidateRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await candidate_service.update(
            request.state.user_id, payload.model_dump(exclude_none=True)
        )
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(profile))


@candidate_router.get("/me/skills")
async def get_my_skills(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await candidate_service.get_by_user_id(request.state.user_id)
        skills = await candidate_service.get_skills(str(profile["id"]))
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok([_serial(s) for s in skills])


@candidate_router.post("/me/skills", status_code=201)
async def add_skill(
    payload: AddSkillRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await candidate_service.get_by_user_id(request.state.user_id)
        skill = await candidate_service.add_skill(
            str(profile["id"]),
            payload.skill_name,
            payload.level,
            payload.years_experience,
        )
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(skill))


@candidate_router.delete("/me/skills/{skill_id}", status_code=204)
async def remove_skill(
    skill_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        profile = await candidate_service.get_by_user_id(request.state.user_id)
        await candidate_service.remove_skill(str(profile["id"]), skill_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)