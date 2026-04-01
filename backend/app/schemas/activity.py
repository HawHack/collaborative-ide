from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel


class ActivityEventRead(APIModel):
    id: str
    project_id: str
    actor_user_id: str | None = None
    event_type: str
    message: str
    payload: dict = Field(default_factory=dict)
    points: int
    created_at: datetime


class ActivityCreateInternal(APIModel):
    project_id: str
    actor_user_id: str | None = None
    event_type: str
    message: str
    payload: dict = Field(default_factory=dict)
    points: int = 0


class LeaderboardEntry(APIModel):
    user_id: str
    full_name: str
    avatar_color: str
    total_points: int
    event_count: int