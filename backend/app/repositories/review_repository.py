from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_review_record import AIReviewRecord


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        project_id: str,
        actor_user_id: str | None,
        provider: str,
        model: str,
        status: str,
        summary: str,
        issues: list,
        suggestions: list,
        merge_suggestion: dict,
        raw_response: str,
        fallback_used: bool,
    ) -> AIReviewRecord:
        review = AIReviewRecord(
            project_id=project_id,
            actor_user_id=actor_user_id,
            provider=provider,
            model=model,
            status=status,
            summary=summary,
            issues=issues,
            suggestions=suggestions,
            merge_suggestion=merge_suggestion,
            raw_response=raw_response,
            fallback_used=fallback_used,
        )
        self.session.add(review)
        await self.session.flush()
        await self.session.refresh(review)
        return review

    async def list_by_project(self, project_id: str, limit: int = 20) -> list[AIReviewRecord]:
        result = await self.session.execute(
            select(AIReviewRecord)
            .where(AIReviewRecord.project_id == project_id)
            .order_by(desc(AIReviewRecord.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())