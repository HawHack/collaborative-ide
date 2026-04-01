from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import add_exception_handlers
from app.core.logging import configure_logging
from app.websocket.routes import websocket_router

configure_logging()
logger = structlog.get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("app.starting", app_name=settings.app_name, env=settings.app_env)
    yield
    logger.info("app.stopping", app_name=settings.app_name, env=settings.app_env)


app = FastAPI(
    title=settings.app_name,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(websocket_router)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}