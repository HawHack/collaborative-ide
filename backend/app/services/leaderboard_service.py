from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.activity import LeaderboardEntry
from app.services.activity_service import ActivityService
from app.services.project_service import ProjectService
from app.models.user import User


class LeaderboardService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_service = ProjectService(session)
        self.activity_service = ActivityService(session)

    async def get_project_leaderboard(self, *, project_id: str, user: User, limit: int = 20) -> list[LeaderboardEntry]:
        await self.project_service.get_project_model(project_id=project_id, user=user)
        return await self.activity_service.leaderboard(project_id=project_id, limit=limit)