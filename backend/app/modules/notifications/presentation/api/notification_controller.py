from fastapi import APIRouter, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.exceptions import EDSServiceException
from app.modules.notifications.services.notification_service import NotificationService

notification_router = APIRouter(prefix="/notifications", tags=["Notifications"])
notification_service = NotificationService()
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


@notification_router.get("")
async def list_notifications(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    notifications = await notification_service.list(request.state.user_id)
    return _ok([_serial(n) for n in notifications])


@notification_router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: str,
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    try:
        await notification_service.mark_read(notification_id, request.state.user_id)
    except EDSServiceException as exc:
        raise HTTPException(status_code=404, detail=exc.message_en)


@notification_router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    request: Request,
    _: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    await notification_service.mark_all_read(request.state.user_id)