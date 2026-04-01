from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_event import ActivityEvent
from app.models.user import User


class ActivityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        project_id: str,
        actor_user_id: str | None,
        event_type: str,
        message: str,
        payload: dict,
        points: int,
    ) -> ActivityEvent:
        event = ActivityEvent(
            project_id=project_id,
            actor_user_id=actor_user_id,
            event_type=event_type,
            message=message,
            payload=payload,
            points=points,
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def list_by_project(self, project_id: str, limit: int = 50) -> list[ActivityEvent]:
        result = await self.session.execute(
            select(ActivityEvent)
            .where(ActivityEvent.project_id == project_id)
            .order_by(desc(ActivityEvent.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def leaderboard(self, project_id: str, limit: int = 20) -> list[dict]:
        result = await self.session.execute(
            select(
                User.id.label("user_id"),
                User.full_name,
                User.avatar_color,
                func.coalesce(func.sum(ActivityEvent.points), 0).label("total_points"),
                func.count(ActivityEvent.id).label("event_count"),
            )
            .join(User, User.id == ActivityEvent.actor_user_id)
            .where(ActivityEvent.project_id == project_id)
            .group_by(User.id, User.full_name, User.avatar_color)
            .order_by(desc("total_points"), desc("event_count"))
            .limit(limit)
        )
        return [dict(row._mapping) for row in result]