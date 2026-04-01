from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.schemas.execution import ExecutorRunResponse

settings = get_settings()


class ExecutorClient:
    async def execute(self, *, language: str, source_code: str) -> ExecutorRunResponse:
        headers = {
            "Authorization": f"Bearer {settings.executor_shared_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "language": language,
            "source_code": source_code,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{settings.executor_url.rstrip('/')}/execute", headers=headers, json=payload)
            response.raise_for_status()
            return ExecutorRunResponse.model_validate(response.json())