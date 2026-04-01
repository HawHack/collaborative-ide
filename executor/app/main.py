from __future__ import annotations

import structlog
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import ORJSONResponse

from app.config import get_settings
from app.schemas import ExecuteRequest, ExecuteResponse
from app.service import SandboxExecutor

settings = get_settings()
logger = structlog.get_logger(__name__)

app = FastAPI(title="Collaborative IDE Executor", default_response_class=ORJSONResponse)
executor = SandboxExecutor()


def verify_bearer(authorization: str | None = Header(default=None)) -> None:
    expected = f"Bearer {settings.executor_shared_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid executor token.")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/execute", response_model=ExecuteResponse, dependencies=[Depends(verify_bearer)])
async def execute(payload: ExecuteRequest) -> ExecuteResponse:
    logger.info("executor.request_received", language=payload.language)
    return executor.execute(language=payload.language, source_code=payload.source_code)