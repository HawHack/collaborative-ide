from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    language: Mapped[str] = mapped_column(String(32), nullable=False, default="python")
    visibility: Mapped[str] = mapped_column(String(16), nullable=False, default="private")

    owner = relationship("User", back_populates="owned_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ActivityEvent", back_populates="project", cascade="all, delete-orphan")
    runs = relationship("ExecutionRun", back_populates="project", cascade="all, delete-orphan")
    ai_reviews = relationship("AIReviewRecord", back_populates="project", cascade="all, delete-orphan")
    document = relationship("ProjectDocument", back_populates="project", uselist=False, cascade="all, delete-orphan")