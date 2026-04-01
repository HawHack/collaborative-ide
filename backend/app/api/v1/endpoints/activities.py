from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import db_session, get_current_user
from app.models.user import User
from app.schemas.activity import ActivityEventRead, LeaderboardEntry
from app.services.activity_service import ActivityService
from app.services.leaderboard_service import LeaderboardService
from app.services.project_service import ProjectService

router = APIRouter()


@router.get("/projects/{project_id}", response_model=list[ActivityEventRead])
async def list_project_activities(
    project_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> list[ActivityEventRead]:
    await ProjectService(session).get_project_model(project_id=project_id, user=current_user)
    return await ActivityService(session).list_project_events(project_id=project_id, limit=limit)


@router.get("/projects/{project_id}/leaderboard", response_model=list[LeaderboardEntry])
async def project_leaderboard(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> list[LeaderboardEntry]:
    return await LeaderboardService(session).get_project_leaderboard(
        project_id=project_id,
        user=current_user,
        limit=limit,
    )