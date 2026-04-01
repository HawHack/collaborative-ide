from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


@dataclass(slots=True)
class AppError(Exception):
    message: str
    code: str
    status_code: int
    details: dict[str, Any] | None = None


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, code="not_found", status_code=404, details=details)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, code="conflict", status_code=409, details=details)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, code="unauthorized", status_code=401, details=details)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, code="forbidden", status_code=403, details=details)


class BadRequestError(AppError):
    def __init__(self, message: str = "Bad request.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, code="bad_request", status_code=400, details=details)


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details or {},
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected error occurred.",
                    "details": {"type": exc.__class__.__name__},
                }
            },
        )