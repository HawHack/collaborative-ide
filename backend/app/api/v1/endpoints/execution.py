from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import db_session, get_current_user
from app.models.user import User
from app.schemas.execution import ExecutionRunRead, RunCodeRequest
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post("/projects/{project_id}/run", response_model=ExecutionRunRead, status_code=status.HTTP_201_CREATED)
async def run_project_code(
    project_id: str,
    payload: RunCodeRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ExecutionRunRead:
    return await ExecutionService(session).run_code(
        project_id=project_id,
        user=current_user,
        language=payload.language,
        source_code=payload.source_code,
    )


@router.get("/projects/{project_id}/runs", response_model=list[ExecutionRunRead])
async def list_project_runs(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> list[ExecutionRunRead]:
    return await ExecutionService(session).list_runs(
        project_id=project_id,
        user=current_user,
        limit=limit,
    )