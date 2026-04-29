from fastapi import APIRouter, File, HTTPException, Request, Security, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.video.services.video_service import VideoService
from app.modules.video.services.video_analysis_service import VideoAnalysisService

video_router = APIRouter(prefix="/video", tags=["Video"])
video_service = VideoService()
video_analysis_service = VideoAnalysisService()
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
        elif isinstance(v, dict):
            result[k] = _serial(v)
        else:
            result[k] = v
    return result


@video_router.post("/{application_id}", status_code=status.HTTP_201_CREATED)
async def upload_video(
    application_id: str,
    request: Request,
    file: UploadFile = File(...),
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """Рекрутер загружает запись интервью после встречи (Zoom, Meet и т.п.)."""
    if getattr(request.state, "user_role", None) != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can upload interview recordings")
    try:
        video = await video_service.upload(application_id, request.state.user_id, file)
    except EDSServiceException as exc:
        raise HTTPException(status_code=400, detail=exc.message_en)
    return _ok(_serial(video))


@video_router.get("/{application_id}")
async def get_video(
    application_id: str,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        video = await video_service.get_by_application(application_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)
    return _ok(_serial(video))


@video_router.post("/{application_id}/analyze", status_code=status.HTTP_200_OK)
async def analyze_video(
    application_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """Whisper транскрибирует видео → GPT-4 анализирует речь кандидата."""
    if getattr(request.state, "user_role", None) != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can analyze interviews")
    try:
        result = await video_analysis_service.analyze(application_id, request.state.user_id)
    except EDSServiceException as exc:
        code = exc.code
        http_status = 404 if "NOT_FOUND" in code else 400
        raise HTTPException(status_code=http_status, detail=exc.message_en)
    return _ok(_serial(result))