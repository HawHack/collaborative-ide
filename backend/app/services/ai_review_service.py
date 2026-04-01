from __future__ import annotations

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.normalizer import fallback_review, normalize_review_response
from app.ai.prompt_builder import build_review_messages
from app.ai.provider import AIProviderClient
from app.models.user import User
from app.repositories.review_repository import ReviewRepository
from app.schemas.ai_review import AIReviewResponse, MergeSuggestion, ReviewIssue, ReviewSuggestion
from app.services.activity_service import ActivityService
from app.services.project_service import ProjectService
from app.websocket.event_bus import EventBus

logger = structlog.get_logger(__name__)


class AIReviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_service = ProjectService(session)
        self.review_repository = ReviewRepository(session)
        self.activity_service = ActivityService(session)
        self.provider_client = AIProviderClient()

    async def review_code(
        self,
        *,
        project_id: str,
        user: User,
        source_code: str,
        language: str,
        collaboration_context: dict,
    ) -> AIReviewResponse:
        project = await self.project_service.get_project_model(project_id=project_id, user=user)

        messages = build_review_messages(
            project_name=project.name,
            language=language,
            source_code=source_code,
            collaboration_context=collaboration_context,
        )

        raw_response = ""
        normalized: AIReviewResponse

        try:
            raw_response = await self.provider_client.review(messages)
            normalized = normalize_review_response(
                project_id=project_id,
                provider=self.provider_client.provider_name,
                model=self.provider_client.model_name,
                raw_response=raw_response,
            )
        except Exception as exc:
            logger.exception(
                "ai.review_failed",
                project_id=project.id,
                user_id=user.id,
                provider=self.provider_client.provider_name,
                model=self.provider_client.model_name,
            )
            normalized = fallback_review(
                project_id=project_id,
                provider=self.provider_client.provider_name,
                model=self.provider_client.model_name,
                source_code=source_code,
                language=language,
                collaboration_context=collaboration_context,
                raw_response=str(exc),
            )

        record = await self.review_repository.create(
            project_id=project.id,
            actor_user_id=user.id,
            provider=normalized.provider,
            model=normalized.model,
            status=normalized.status,
            summary=normalized.summary,
            issues=[issue.model_dump(mode="json") for issue in normalized.issues],
            suggestions=[item.model_dump(mode="json") for item in normalized.suggestions],
            merge_suggestion=normalized.merge_suggestion.model_dump(mode="json"),
            raw_response=normalized.raw_response,
            fallback_used=normalized.fallback_used,
        )
        await self.session.commit()

        response = AIReviewResponse(
            project_id=record.project_id,
            provider=record.provider,
            model=record.model,
            status=record.status,
            summary=record.summary,
            issues=[ReviewIssue(**item) for item in record.issues],
            suggestions=[ReviewSuggestion(**item) for item in record.suggestions],
            merge_suggestion=MergeSuggestion(**record.merge_suggestion),
            raw_response=record.raw_response,
            fallback_used=record.fallback_used,
        )

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="ai.review.created",
            message=(
                f"{user.full_name} ran AI review"
                + (" (fallback mode)" if response.fallback_used else f" via {response.provider}")
            ),
            payload={
                "provider": response.provider,
                "model": response.model,
                "fallbackUsed": response.fallback_used,
                "issueCount": len(response.issues),
                "shouldMerge": response.merge_suggestion.should_merge,
            },
            points=4,
            commit=True,
            broadcast=True,
        )

        await EventBus.publish(
            project_id=project.id,
            event_type="review.created",
            payload=response.model_dump(mode="json"),
        )

        return response

    async def list_reviews(
        self,
        *,
        project_id: str,
        user: User,
        limit: int = 20,
    ) -> list[AIReviewResponse]:
        await self.project_service.get_project_model(project_id=project_id, user=user)
        reviews = await self.review_repository.list_by_project(project_id=project_id, limit=limit)

        return [
            AIReviewResponse(
                project_id=item.project_id,
                provider=item.provider,
                model=item.model,
                status=item.status,
                summary=item.summary,
                issues=[ReviewIssue(**issue) for issue in item.issues],
                suggestions=[ReviewSuggestion(**suggestion) for suggestion in item.suggestions],
                merge_suggestion=MergeSuggestion(**item.merge_suggestion),
                raw_response=item.raw_response,
                fallback_used=item.fallback_used,
            )
            for item in reviews
        ]