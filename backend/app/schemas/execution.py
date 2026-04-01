from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel


RunStatus = Literal["queued", "running", "completed", "failed", "timeout"]


class RunCodeRequest(APIModel):
    source_code: str = Field(min_length=1, max_length=200_000)
    language: Literal["python", "javascript"]


class ExecutionRunRead(APIModel):
    id: str
    project_id: str
    actor_user_id: str | None = None
    language: str
    status: RunStatus
    source_code: str
    stdout: str
    stderr: str
    combined_output: str
    exit_code: int | None = None
    duration_ms: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    limits: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ExecutorRunResponse(APIModel):
    status: RunStatus
    stdout: str
    stderr: str
    combined_output: str
    exit_code: int | None = None
    duration_ms: int | None = None
    timed_out: bool = False
    limits: dict = Field(default_factory=dict)