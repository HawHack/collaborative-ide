from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import APIModel
from app.schemas.user import UserRead


class RegisterRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserRead


class RefreshResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class AuthSessionResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserRead