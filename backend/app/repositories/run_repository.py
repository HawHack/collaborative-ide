from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.execution_run import ExecutionRun


class RunRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        project_id: str,
        actor_user_id: str | None,
        language: str,
        source_code: str,
        status: str,
        limits: dict,
    ) -> ExecutionRun:
        run = ExecutionRun(
            project_id=project_id,
            actor_user_id=actor_user_id,
            language=language,
            source_code=source_code,
            status=status,
            limits=limits,
        )
        self.session.add(run)
        await self.session.flush()
        await self.session.refresh(run)
        return run

    async def get_by_id(self, run_id: str) -> ExecutionRun | None:
        return await self.session.get(ExecutionRun, run_id)

    async def list_by_project(self, project_id: str, limit: int = 20) -> list[ExecutionRun]:
        result = await self.session.execute(
            select(ExecutionRun)
            .where(ExecutionRun.project_id == project_id)
            .order_by(desc(ExecutionRun.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def save(self, run: ExecutionRun) -> ExecutionRun:
        self.session.add(run)
        await self.session.flush()
        await self.session.refresh(run)
        return run