from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityCreateInternal, ActivityEventRead, LeaderboardEntry
from app.websocket.event_bus import EventBus


class ActivityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.activity_repository = ActivityRepository(session)

    async def record(
        self,
        *,
        project_id: str,
        actor_user_id: str | None,
        event_type: str,
        message: str,
        payload: dict,
        points: int = 0,
        commit: bool = True,
        broadcast: bool = True,
    ) -> ActivityEventRead:
        event = await self.activity_repository.create(
            project_id=project_id,
            actor_user_id=actor_user_id,
            event_type=event_type,
            message=message,
            payload=payload,
            points=points,
        )
        if commit:
            await self.session.commit()
        schema = ActivityEventRead(
            id=event.id,
            project_id=event.project_id,
            actor_user_id=event.actor_user_id,
            event_type=event.event_type,
            message=event.message,
            payload=event.payload,
            points=event.points,
            created_at=event.created_at,
        )
        if broadcast:
            await EventBus.publish(
                project_id=project_id,
                event_type="activity.event",
                payload=schema.model_dump(mode="json"),
            )
        return schema

    async def list_project_events(self, *, project_id: str, limit: int = 50) -> list[ActivityEventRead]:
        events = await self.activity_repository.list_by_project(project_id=project_id, limit=limit)
        return [
            ActivityEventRead(
                id=item.id,
                project_id=item.project_id,
                actor_user_id=item.actor_user_id,
                event_type=item.event_type,
                message=item.message,
                payload=item.payload,
                points=item.points,
                created_at=item.created_at,
            )
            for item in events
        ]

    async def leaderboard(self, *, project_id: str, limit: int = 20) -> list[LeaderboardEntry]:
        rows = await self.activity_repository.leaderboard(project_id=project_id, limit=limit)
        return [LeaderboardEntry(**row) for row in rows]