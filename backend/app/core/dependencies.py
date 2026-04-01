from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.security import TokenPayloadError, decode_access_token
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.user_repository import UserRepository


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    session: AsyncSession = Depends(db_session),
    authorization: str | None = Header(default=None),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing bearer token.")

    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except TokenPayloadError as exc:
        raise UnauthorizedError(str(exc)) from exc

    user = await UserRepository(session).get_by_id(payload["sub"])
    if user is None:
        raise UnauthorizedError("User not found for token.")
    return user