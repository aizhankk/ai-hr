from fastapi import APIRouter, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.matching.presentation.schemas.requests.match_jobs_request import (
    MatchJobsRequest,
)
from app.modules.matching.services.matching_service import MatchingService

matching_router = APIRouter(prefix="/matching", tags=["Matching"])
matching_service = MatchingService()
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


@matching_router.post("/jobs", status_code=status.HTTP_200_OK)
async def match_jobs(
    payload: MatchJobsRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """Семантический подбор вакансий под выбранное резюме кандидата."""
    if getattr(request.state, "user_role", None) != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only")
    try:
        result = await matching_service.match_jobs_for_resume(
            request.state.user_id,
            str(payload.resume_id) if payload.resume_id else None,
            payload.limit,
        )
    except EDSServiceException as exc:
        if exc.code == "OPENAI_NOT_CONFIGURED":
            http_status = 503
        elif "NOT_FOUND" in exc.code:
            http_status = 404
        else:
            http_status = 400
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    result["jobs"] = [_serial(j) for j in result.get("jobs", [])]
    return _ok(result)
