from __future__ import annotations

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AIReviewRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_review_records"
    __table_args__ = (
        Index("ix_ai_review_records_project_id_created_at", "project_id", "created_at"),
    )

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    issues: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    suggestions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    merge_suggestion: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    raw_response: Mapped[str] = mapped_column(Text, nullable=False, default="")
    fallback_used: Mapped[bool] = mapped_column(nullable=False, default=False)

    project = relationship("Project", back_populates="ai_reviews")