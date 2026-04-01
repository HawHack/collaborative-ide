from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProjectMemberUserRead(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_color: str


class ProjectMemberRead(BaseModel):
    role: Literal["owner", "editor", "viewer"]
    joined_at: datetime
    user: ProjectMemberUserRead


class ProjectListItem(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str
    language: Literal["python", "javascript"]
    visibility: Literal["private", "team"]
    member_count: int
    last_activity_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ProjectRead(ProjectListItem):
    members: list[ProjectMemberRead]
    collab_ws_url: str


class ProjectDocumentRead(BaseModel):
    project_id: str
    plain_text: str
    last_synced_at: datetime | None
    ydoc_state_base64: str | None


class ProjectRoomInfo(BaseModel):
    project: ProjectRead
    document: ProjectDocumentRead
    current_user_role: Literal["owner", "editor", "viewer"]
    collab_ws_url: str


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    language: Literal["python", "javascript"] = "python"


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    language: Literal["python", "javascript"] | None = None


class ProjectDocumentUpdateRequest(BaseModel):
    plain_text: str = Field(default="", max_length=500_000)


class ProjectDocumentUpdateResponse(BaseModel):
    project_id: str
    plain_text: str
    last_synced_at: datetime | None
    updated_by_user_id: str | None