from fastapi import APIRouter

from app.api.v1.endpoints import activities, ai_review, auth, execution, projects, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
api_router.include_router(execution.router, prefix="/execution", tags=["execution"])
api_router.include_router(ai_review.router, prefix="/reviews", tags=["reviews"])