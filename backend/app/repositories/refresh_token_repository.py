from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: str,
        token_hash: str,
        token_jti: str,
        expires_at: datetime,
        user_agent: str,
        ip_address: str,
    ) -> RefreshToken:
        item = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            token_jti=token_jti,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def get_active_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
        )
        item = result.scalar_one_or_none()
        if item and item.expires_at < datetime.now(UTC):
            return None
        return item

    async def revoke_by_jti(self, token_jti: str) -> None:
        result = await self.session.execute(select(RefreshToken).where(RefreshToken.token_jti == token_jti))
        item = result.scalar_one_or_none()
        if item and item.revoked_at is None:
            item.revoked_at = datetime.now(UTC)
            await self.session.flush()

    async def revoke_by_hash(self, token_hash: str) -> None:
        result = await self.session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        item = result.scalar_one_or_none()
        if item and item.revoked_at is None:
            item.revoked_at = datetime.now(UTC)
            await self.session.flush()