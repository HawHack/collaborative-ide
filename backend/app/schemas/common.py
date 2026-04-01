from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MessageResponse(APIModel):
    message: str


class PaginatedResponse(APIModel, Generic[T]):
    items: list[T]
    total: int


class TimestampedMixin(APIModel):
    created_at: datetime
    updated_at: datetime