from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


class TokenPayloadError(ValueError):
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> tuple[str, datetime]:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "jti": str(uuid4()),
        "exp": int(expires_at.timestamp()),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)
    return token, expires_at


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid4())
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": jti,
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_refresh_secret_key, algorithm=ALGORITHM)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise TokenPayloadError("Invalid access token.") from exc
    if payload.get("type") != "access":
        raise TokenPayloadError("Invalid access token type.")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_refresh_secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise TokenPayloadError("Invalid refresh token.") from exc
    if payload.get("type") != "refresh":
        raise TokenPayloadError("Invalid refresh token type.")
    return payload