from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import db_session, get_current_user
from app.models.user import User
from app.schemas.ai_review import AIReviewRequest, AIReviewResponse
from app.services.ai_review_service import AIReviewService

router = APIRouter()


@router.post("/projects/{project_id}", response_model=AIReviewResponse, status_code=status.HTTP_201_CREATED)
async def review_project_code(
    project_id: str,
    payload: AIReviewRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> AIReviewResponse:
    return await AIReviewService(session).review_code(
        project_id=project_id,
        user=current_user,
        source_code=payload.source_code,
        language=payload.language,
        collaboration_context=payload.collaboration_context,
    )


@router.get("/projects/{project_id}", response_model=list[AIReviewResponse])
async def list_project_reviews(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> list[AIReviewResponse]:
    return await AIReviewService(session).list_reviews(
        project_id=project_id,
        user=current_user,
        limit=limit,
    )