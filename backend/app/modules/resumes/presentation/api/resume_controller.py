from fastapi import APIRouter, File, HTTPException, Request, Security, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.resumes.services.resume_service import ResumeService

resume_router = APIRouter(prefix="/resumes", tags=["Resumes"])
resume_service = ResumeService()
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
        elif isinstance(v, dict):
            result[k] = _serial(v)
        else:
            result[k] = v
    return result


@resume_router.post("", status_code=status.HTTP_201_CREATED)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        resume = await resume_service.upload(request.state.user_id, file)
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(resume))


@resume_router.get("")
async def list_resumes(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        resumes = await resume_service.list_resumes(request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok([_serial(r) for r in resumes])


@resume_router.get("/{resume_id}")
async def get_resume(
    resume_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        resume = await resume_service.get_with_parsed(resume_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(resume))


@resume_router.patch("/{resume_id}/primary")
async def set_primary(
    resume_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        resume = await resume_service.set_primary(resume_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(resume))


@resume_router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await resume_service.delete(resume_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)