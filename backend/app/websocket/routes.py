from __future__ import annotations

import asyncio
import contextlib
import json

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import TokenPayloadError, decode_access_token
from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.services.project_service import ProjectService
from app.websocket.event_bus import EventBus

logger = structlog.get_logger(__name__)
websocket_router = APIRouter()


async def _authorize_websocket(websocket: WebSocket, project_id: str):
    token = websocket.query_params.get("token")
    if not token:
        logger.warning("ws.auth_failed", reason="missing_token", project_id=project_id)
        await websocket.close(code=4401, reason="Missing access token.")
        return None

    try:
        payload = decode_access_token(token)
    except TokenPayloadError:
        logger.warning("ws.auth_failed", reason="invalid_token", project_id=project_id)
        await websocket.close(code=4401, reason="Invalid access token.")
        return None

    async with SessionLocal() as session:
        user = await UserRepository(session).get_by_id(payload["sub"])
        if user is None:
            logger.warning(
                "ws.auth_failed",
                reason="user_not_found",
                project_id=project_id,
                user_id=payload.get("sub"),
            )
            await websocket.close(code=4401, reason="User not found.")
            return None

        service = ProjectService(session)
        try:
            await service.get_project_model(project_id=project_id, user=user)
        except Exception as exc:
            logger.warning(
                "ws.auth_failed",
                reason="project_access_denied",
                project_id=project_id,
                user_id=user.id,
                error=str(exc),
            )
            await websocket.close(code=4403, reason="Project access denied.")
            return None

        logger.info("ws.auth_ok", project_id=project_id, user_id=user.id)
        return user


async def _redis_to_websocket(websocket: WebSocket, project_id: str) -> None:
    pubsub = await EventBus.create_pubsub()
    await EventBus.subscribe_project(pubsub=pubsub, project_id=project_id)
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message.get("data")
            if not data:
                continue
            await websocket.send_text(data)
    finally:
        await pubsub.unsubscribe(f"project-events:{project_id}")
        await pubsub.close()


@websocket_router.websocket("/ws/events/{project_id}")
async def project_events_websocket(websocket: WebSocket, project_id: str) -> None:
    user = await _authorize_websocket(websocket, project_id)
    if user is None:
        return

    await websocket.accept()
    logger.info("ws.connected", project_id=project_id, user_id=user.id)

    forward_task = asyncio.create_task(_redis_to_websocket(websocket, project_id))

    await EventBus.publish(
        project_id=project_id,
        event_type="presence.connected",
        payload={
            "userId": user.id,
            "fullName": user.full_name,
            "avatarColor": user.avatar_color,
        },
    )

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                incoming = json.loads(raw_message)
            except json.JSONDecodeError:
                incoming = {"type": "ping"}

            if incoming.get("type") == "ping":
                await websocket.send_json({"type": "pong", "projectId": project_id})
            elif incoming.get("type") == "client.activity":
                payload = incoming.get("payload", {})
                await EventBus.publish(
                    project_id=project_id,
                    event_type="client.activity",
                    payload={
                        "userId": user.id,
                        "fullName": user.full_name,
                        "avatarColor": user.avatar_color,
                        **payload,
                    },
                )
    except WebSocketDisconnect:
        logger.info("ws.disconnected", project_id=project_id, user_id=user.id)
    finally:
        forward_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await forward_task
        await EventBus.publish(
            project_id=project_id,
            event_type="presence.disconnected",
            payload={
                "userId": user.id,
                "fullName": user.full_name,
                "avatarColor": user.avatar_color,
            },
        )