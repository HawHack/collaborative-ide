from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.activity_event import ActivityEvent
from app.models.project import Project
from app.models.project_member import ProjectMember


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _with_relationships(self):
        return (
            joinedload(Project.members).joinedload(ProjectMember.user),
            joinedload(Project.owner),
            joinedload(Project.document),
        )

    async def list_accessible(self, user_id: str, search: str | None = None) -> list[Project]:
        stmt = (
            select(Project)
            .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
            .where(or_(Project.owner_id == user_id, ProjectMember.user_id == user_id))
            .options(*self._with_relationships())
            .order_by(Project.updated_at.desc())
            .distinct()
        )
        if search:
            stmt = stmt.where(Project.name.ilike(f"%{search}%"))
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_id(self, project_id: str) -> Project | None:
        result = await self.session.execute(
            select(Project).where(Project.id == project_id).options(*self._with_relationships())
        )
        return result.unique().scalar_one_or_none()

    async def get_accessible(self, project_id: str, user_id: str) -> Project | None:
        stmt = (
            select(Project)
            .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
            .where(Project.id == project_id)
            .where(or_(Project.owner_id == user_id, ProjectMember.user_id == user_id))
            .options(*self._with_relationships())
            .distinct()
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def create(
        self,
        *,
        owner_id: str,
        name: str,
        description: str,
        language: str,
    ) -> Project:
        project = Project(
            owner_id=owner_id,
            name=name,
            description=description,
            language=language,
            visibility="private",
        )
        self.session.add(project)
        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def add_member(self, *, project_id: str, user_id: str, role: str = "editor") -> ProjectMember:
        member = ProjectMember(project_id=project_id, user_id=user_id, role=role)
        self.session.add(member)
        await self.session.flush()
        return member

    async def delete(self, project: Project) -> None:
        await self.session.delete(project)

    async def get_last_activity_at(self, project_id: str):
        result = await self.session.execute(
            select(func.max(ActivityEvent.created_at)).where(ActivityEvent.project_id == project_id)
        )
        return result.scalar_one_or_none()
