from fastapi import APIRouter

from app.modules.applications.presentation.api.application_controller import application_router
from app.modules.auth.presentation.api.auth_controller import auth_router
from app.modules.candidates.presentation.api.candidate_controller import candidate_router
from app.modules.jobs.presentation.api.job_controller import job_router
from app.modules.notifications.presentation.api.notification_controller import notification_router
from app.modules.recruiters.presentation.api.recruiter_controller import recruiter_router
from app.modules.resumes.presentation.api.resume_controller import resume_router
from app.modules.video.presentation.api.video_controller import video_router

main_router = APIRouter(prefix="/api")

main_router.include_router(auth_router)
main_router.include_router(recruiter_router)
main_router.include_router(candidate_router)
main_router.include_router(resume_router)
main_router.include_router(job_router)
main_router.include_router(application_router)
main_router.include_router(video_router)
main_router.include_router(notification_router)