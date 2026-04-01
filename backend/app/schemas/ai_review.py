from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel


IssueSeverity = Literal["low", "medium", "high"]


class ReviewIssue(APIModel):
    severity: IssueSeverity
    title: str
    description: str
    line_start: int | None = None
    line_end: int | None = None


class ReviewSuggestion(APIModel):
    title: str
    description: str
    patch_hint: str | None = None


class MergeSuggestion(APIModel):
    should_merge: bool
    rationale: str
    blockers: list[str] = Field(default_factory=list)


class AIReviewRequest(APIModel):
    source_code: str = Field(min_length=1, max_length=200_000)
    language: Literal["python", "javascript"]
    collaboration_context: dict = Field(default_factory=dict)


class AIReviewResponse(APIModel):
    id: str | None = None
    project_id: str
    provider: str
    model: str
    status: str
    summary: str
    issues: list[ReviewIssue]
    suggestions: list[ReviewSuggestion]
    merge_suggestion: MergeSuggestion
    raw_response: str = ""
    fallback_used: bool = False
    created_at: datetime | None = None