from fastapi import APIRouter, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.ai_assist.presentation.schemas.requests.chat_request import ChatRequest
from app.modules.ai_assist.presentation.schemas.requests.match_preview_request import (
    MatchPreviewRequest,
)
from app.modules.ai_assist.services.ai_assist_service import AiAssistService

ai_assist_router = APIRouter(prefix="/ai-assist", tags=["AI Assist"])
ai_assist_service = AiAssistService()
bearer_scheme = HTTPBearer()


def _ok(data):
    return {"status": "success", "data": data}


@ai_assist_router.post("/match-preview", status_code=status.HTTP_200_OK)
async def match_preview(
    payload: MatchPreviewRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    if getattr(request.state, "user_role", None) != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only")
    try:
        result = await ai_assist_service.match_preview(
            request.state.user_id,
            str(payload.job_posting_id),
            str(payload.resume_id) if payload.resume_id else None,
        )
    except EDSServiceException as exc:
        http_status = 404 if "NOT_FOUND" in exc.code else 400
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return _ok(result)


@ai_assist_router.post("/chat", status_code=status.HTTP_200_OK)
async def chat(
    payload: ChatRequest,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    if getattr(request.state, "user_role", None) != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only")
    try:
        result = await ai_assist_service.chat(
            request.state.user_id,
            [m.model_dump() for m in payload.messages],
            str(payload.job_posting_id) if payload.job_posting_id else None,
            str(payload.resume_id) if payload.resume_id else None,
        )
    except EDSServiceException as exc:
        http_status = 503 if exc.code in {"OPENAI_NOT_CONFIGURED", "AI_CHAT_FAILED"} else 400
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return _ok(result)
