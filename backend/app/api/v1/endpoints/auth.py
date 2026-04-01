from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import db_session, get_current_user
from app.core.exceptions import UnauthorizedError
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, LoginRequest, RefreshResponse, RegisterRequest
from app.schemas.common import MessageResponse
from app.schemas.user import UserRead
from app.services.auth_service import AuthService

router = APIRouter()
settings = get_settings()


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> AuthSessionResponse:
    auth_service = AuthService(session)
    user = await auth_service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    user, access_token, expires_at, refresh_token = await auth_service.login(
        email=user.email,
        password=payload.password,
    )
    AuthService.set_refresh_cookie(
        response=response,
        refresh_token=refresh_token,
        max_age_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
        secure=settings.secure_cookies,
    )
    return AuthSessionResponse(
        access_token=access_token,
        token_type="bearer",
        expires_at=expires_at,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=AuthSessionResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> AuthSessionResponse:
    auth_service = AuthService(session)
    user, access_token, expires_at, refresh_token = await auth_service.login(
        email=payload.email,
        password=payload.password,
    )
    AuthService.set_refresh_cookie(
        response=response,
        refresh_token=refresh_token,
        max_age_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
        secure=settings.secure_cookies,
    )
    return AuthSessionResponse(
        access_token=access_token,
        token_type="bearer",
        expires_at=expires_at,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> RefreshResponse:
    auth_service = AuthService(session)
    refresh_token = auth_service.extract_refresh_cookie(request)
    if not refresh_token:
        raise UnauthorizedError("Refresh token cookie is missing.")

    access_token, expires_at = await auth_service.refresh(refresh_token)
    return RefreshResponse(
        access_token=access_token,
        token_type="bearer",
        expires_at=expires_at,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> MessageResponse:
    auth_service = AuthService(session)
    refresh_token = auth_service.extract_refresh_cookie(request)
    await auth_service.logout(refresh_token)
    AuthService.clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully.")


@router.get("/session", response_model=UserRead)
async def session_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)