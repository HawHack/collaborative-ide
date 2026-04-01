from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis

from app.core.config import get_settings

settings = get_settings()


class EventBus:
    _redis: Redis | None = None

    @classmethod
    def _channel_name(cls, project_id: str) -> str:
        return f"project-events:{project_id}"

    @classmethod
    def get_client(cls) -> Redis:
        if cls._redis is None:
            cls._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        return cls._redis

    @classmethod
    async def publish(cls, *, project_id: str, event_type: str, payload: dict[str, Any]) -> None:
        message = {
            "type": event_type,
            "projectId": project_id,
            "payload": payload,
        }
        await cls.get_client().publish(cls._channel_name(project_id), json.dumps(message))

    @classmethod
    async def create_pubsub(cls):
        pubsub = cls.get_client().pubsub()
        return pubsub

    @classmethod
    async def subscribe_project(cls, *, pubsub, project_id: str) -> None:
        await pubsub.subscribe(cls._channel_name(project_id))