from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.jobs.presentation.schemas.requests.add_job_skill_request import AddJobSkillRequest
from app.modules.jobs.presentation.schemas.requests.change_status_request import ChangeStatusRequest
from app.modules.jobs.presentation.schemas.requests.create_job_request import CreateJobRequest
from app.modules.jobs.presentation.schemas.requests.update_job_request import UpdateJobRequest
from app.modules.jobs.services.job_service import JobService

job_router = APIRouter(prefix="/jobs", tags=["Jobs"])
job_service = JobService()
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
        elif isinstance(v, list):
            result[k] = [_serial(i) if isinstance(i, dict) else i for i in v]
        else:
            result[k] = v
    return result


@job_router.get("")
async def list_jobs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str = Query("", description="Search by title, company or description"),
    employment_type: str = Query("", description="Filter by employment type"),
    location: str = Query("", description="Filter by location"),
):
    jobs = await job_service.list_published(
        limit=limit, offset=offset,
        search=search, employment_type=employment_type, location=location,
    )
    return _ok([_serial(j) for j in jobs])


@job_router.get("/my")
async def my_jobs(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        jobs = await job_service.get_my_jobs(request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok([_serial(j) for j in jobs])


@job_router.post("", status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: CreateJobRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        job = await job_service.create(request.state.user_id, payload.model_dump())
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(job))


@job_router.get("/{job_id}")
async def get_job(job_id: str):
    try:
        job = await job_service.get_by_id(job_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(job))


@job_router.put("/{job_id}")
async def update_job(
    job_id: str,
    payload: UpdateJobRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        job = await job_service.update(job_id, request.state.user_id, payload.model_dump(exclude_none=True))
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(job))


@job_router.patch("/{job_id}/status")
async def change_status(
    job_id: str,
    payload: ChangeStatusRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        job = await job_service.change_status(job_id, request.state.user_id, payload.status)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(job))


@job_router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await job_service.delete(job_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)


@job_router.post("/{job_id}/skills", status_code=status.HTTP_201_CREATED)
async def add_skill(
    job_id: str,
    payload: AddJobSkillRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        skill = await job_service.add_skill(
            job_id, request.state.user_id, payload.skill_name, payload.level, payload.is_required
        )
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(skill))


@job_router.delete("/{job_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_skill(
    job_id: str,
    skill_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await job_service.remove_skill(job_id, skill_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)