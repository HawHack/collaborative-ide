from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project_document import ProjectDocument


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_project_id(self, project_id: str) -> ProjectDocument | None:
        return await self.session.get(ProjectDocument, project_id)

    async def create_initial(self, *, project_id: str, plain_text: str, updated_by_user_id: str | None) -> ProjectDocument:
        document = ProjectDocument(
            project_id=project_id,
            plain_text=plain_text,
            updated_by_user_id=updated_by_user_id,
            last_synced_at=datetime.now(UTC),
        )
        self.session.add(document)
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def update_plain_text(
        self,
        *,
        project_id: str,
        plain_text: str,
        updated_by_user_id: str | None,
        ydoc_state: bytes | None = None,
    ) -> ProjectDocument:
        document = await self.get_by_project_id(project_id)
        if document is None:
            document = ProjectDocument(project_id=project_id)

        document.plain_text = plain_text
        document.updated_by_user_id = updated_by_user_id
        document.last_synced_at = datetime.now(UTC)
        if ydoc_state is not None:
            document.ydoc_state = ydoc_state

        self.session.add(document)
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def get_plain_text(self, project_id: str) -> str:
        result = await self.session.execute(
            select(ProjectDocument.plain_text).where(ProjectDocument.project_id == project_id)
        )
        return result.scalar_one_or_none() or ""