from __future__ import annotations

from datetime import datetime
from secrets import choice
from string import hexdigits

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    TokenPayloadError,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository

AVATAR_COLORS = ["#4f46e5", "#0f766e", "#be123c", "#1d4ed8", "#854d0e", "#7c3aed"]


class AuthService:
    REFRESH_COOKIE_NAME = "refresh_token"

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repository = UserRepository(session)
        self.refresh_repository = RefreshTokenRepository(session)

    async def register(self, *, email: str, password: str, full_name: str) -> User:
        existing = await self.user_repository.get_by_email(email)
        if existing:
            raise ConflictError("A user with this email already exists.")

        color = AVATAR_COLORS[sum(ord(ch) for ch in email.lower()) % len(AVATAR_COLORS)]
        user = await self.user_repository.create(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            avatar_color=color,
        )
        await self.session.commit()
        return user

    async def login(self, *, email: str, password: str) -> tuple[User, str, datetime, str]:
        user = await self.user_repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.")

        access_token, access_expires_at = create_access_token(user.id, extra={"email": user.email})
        refresh_token, token_jti, refresh_expires_at = create_refresh_token(user.id)

        await self.refresh_repository.create(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            token_jti=token_jti,
            expires_at=refresh_expires_at,
            user_agent="",
            ip_address="",
        )
        await self.session.commit()
        return user, access_token, access_expires_at, refresh_token

    async def refresh(self, refresh_token: str) -> tuple[str, datetime]:
        try:
            payload = decode_refresh_token(refresh_token)
        except TokenPayloadError as exc:
            raise UnauthorizedError(str(exc)) from exc

        record = await self.refresh_repository.get_active_by_hash(hash_refresh_token(refresh_token))
        if record is None or record.user_id != payload["sub"] or record.token_jti != payload["jti"]:
            raise UnauthorizedError("Refresh token is invalid or revoked.")

        access_token, access_expires_at = create_access_token(record.user_id)
        return access_token, access_expires_at

    async def logout(self, refresh_token: str | None) -> None:
        if refresh_token:
            await self.refresh_repository.revoke_by_hash(hash_refresh_token(refresh_token))
            await self.session.commit()

    @staticmethod
    def set_refresh_cookie(response: Response, refresh_token: str, max_age_seconds: int, secure: bool) -> None:
        response.set_cookie(
            key=AuthService.REFRESH_COOKIE_NAME,
            value=refresh_token,
            httponly=True,
            secure=secure,
            samesite="lax",
            max_age=max_age_seconds,
            path="/",
        )

    @staticmethod
    def clear_refresh_cookie(response: Response) -> None:
        response.delete_cookie(key=AuthService.REFRESH_COOKIE_NAME, path="/")

    @staticmethod
    def extract_refresh_cookie(request: Request) -> str | None:
        return request.cookies.get(AuthService.REFRESH_COOKIE_NAME)