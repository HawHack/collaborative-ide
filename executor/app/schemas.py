from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    language: Literal["python", "javascript"]
    source_code: str = Field(min_length=1, max_length=200_000)


class ExecuteResponse(BaseModel):
    status: Literal["completed", "failed", "timeout"]
    stdout: str
    stderr: str
    combined_output: str
    exit_code: int | None = None
    duration_ms: int | None = None
    timed_out: bool = False
    limits: dict = Field(default_factory=dict)