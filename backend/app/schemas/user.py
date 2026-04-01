from __future__ import annotations

from pydantic import EmailStr

from app.schemas.common import APIModel, TimestampedMixin


class UserRead(TimestampedMixin):
    id: str
    email: EmailStr
    full_name: str
    avatar_color: str


class UserSummary(APIModel):
    id: str
    email: EmailStr
    full_name: str
    avatar_color: str