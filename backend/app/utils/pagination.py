from __future__ import annotations

from collections.abc import Sequence
from typing import TypeVar

T = TypeVar("T")


def limit_items(items: Sequence[T], limit: int) -> list[T]:
    safe_limit = max(1, min(limit, 100))
    return list(items[:safe_limit])