from __future__ import annotations

from datetime import UTC, datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.executor_client import ExecutorClient
from app.models.user import User
from app.repositories.run_repository import RunRepository
from app.schemas.execution import ExecutionRunRead, ExecutorRunResponse
from app.services.activity_service import ActivityService
from app.services.project_service import ProjectService
from app.websocket.event_bus import EventBus

logger = structlog.get_logger(__name__)


class ExecutionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_service = ProjectService(session)
        self.run_repository = RunRepository(session)
        self.activity_service = ActivityService(session)
        self.executor_client = ExecutorClient()

    async def run_code(self, *, project_id: str, user: User, language: str, source_code: str) -> ExecutionRunRead:
        project = await self.project_service.get_project_model(project_id=project_id, user=user)

        run = await self.run_repository.create(
            project_id=project.id,
            actor_user_id=user.id,
            language=language,
            source_code=source_code,
            status="queued",
            limits={},
        )
        run.started_at = datetime.now(UTC)
        run.status = "running"
        await self.run_repository.save(run)
        await self.session.commit()

        await EventBus.publish(
            project_id=project.id,
            event_type="execution.started",
            payload={"runId": run.id, "language": language, "status": run.status},
        )

        try:
            result = await self.executor_client.execute(language=language, source_code=source_code)
        except Exception as exc:
            logger.exception("execution.run_failed", project_id=project.id, run_id=run.id)
            run.status = "failed"
            run.stderr = f"Executor request failed: {exc}"
            run.combined_output = run.stderr
            run.finished_at = datetime.now(UTC)
            await self.run_repository.save(run)
            await self.session.commit()
            await self.activity_service.record(
                project_id=project.id,
                actor_user_id=user.id,
                event_type="execution.failed",
                message=f"{user.full_name} attempted to run code but execution failed",
                payload={"runId": run.id, "language": language},
                points=0,
            )
            return ExecutionRunRead.model_validate(run)

        await self._apply_executor_result(run=run, result=result)
        await self.session.commit()

        event_type = self._event_type_for_status(run.status)
        points = 5 if run.status == "completed" else 1

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type=event_type,
            message=f"{user.full_name} ran {language} code",
            payload={"runId": run.id, "status": run.status, "exitCode": run.exit_code},
            points=points,
        )

        await EventBus.publish(
            project_id=project.id,
            event_type="execution.finished",
            payload=ExecutionRunRead.model_validate(run).model_dump(mode="json"),
        )
        return ExecutionRunRead.model_validate(run)

    async def list_runs(self, *, project_id: str, user: User, limit: int = 20) -> list[ExecutionRunRead]:
        await self.project_service.get_project_model(project_id=project_id, user=user)
        runs = await self.run_repository.list_by_project(project_id=project_id, limit=limit)
        return [ExecutionRunRead.model_validate(run) for run in runs]

    async def _apply_executor_result(self, *, run, result: ExecutorRunResponse) -> None:
        run.status = result.status
        run.stdout = result.stdout
        run.stderr = result.stderr
        run.combined_output = result.combined_output
        run.exit_code = result.exit_code
        run.duration_ms = result.duration_ms
        run.finished_at = datetime.now(UTC)
        run.limits = result.limits
        await self.run_repository.save(run)

    @staticmethod
    def _event_type_for_status(status: str) -> str:
        if status == "completed":
            return "execution.completed"
        if status == "timeout":
            return "execution.timeout"
        return "execution.failed"
