from __future__ import annotations

import base64

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.repositories.document_repository import DocumentRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectDocumentRead,
    ProjectDocumentUpdateResponse,
    ProjectListItem,
    ProjectMemberRead,
    ProjectMemberUserRead,
    ProjectRead,
    ProjectRoomInfo,
)
from app.services.activity_service import ActivityService

settings = get_settings()


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_repository = ProjectRepository(session)
        self.document_repository = DocumentRepository(session)
        self.activity_service = ActivityService(session)

    def _members_to_schema(self, project: Project) -> list[ProjectMemberRead]:
        members: list[ProjectMemberRead] = []

        owner = getattr(project, "owner", None)
        if owner is not None:
            members.append(
                ProjectMemberRead(
                    role="owner",
                    joined_at=project.created_at,
                    user=ProjectMemberUserRead(
                        id=owner.id,
                        email=owner.email,
                        full_name=owner.full_name,
                        avatar_color=owner.avatar_color,
                    ),
                )
            )

        for member in project.members:
            if member.user is None:
                continue
            members.append(
                ProjectMemberRead(
                    role=member.role,
                    joined_at=member.joined_at,
                    user=ProjectMemberUserRead(
                        id=member.user.id,
                        email=member.user.email,
                        full_name=member.user.full_name,
                        avatar_color=member.user.avatar_color,
                    ),
                )
            )

        return members

    async def get_project_model(self, *, project_id: str, user: User) -> Project:
        project = await self.project_repository.get_accessible(project_id=project_id, user_id=user.id)
        if project is None:
            raise NotFoundError("Project not found.")
        return project

    async def list_projects(self, *, user: User, search: str | None = None) -> list[ProjectListItem]:
        projects = await self.project_repository.list_accessible(user_id=user.id, search=search)
        items: list[ProjectListItem] = []

        for project in projects:
            last_activity_at = await self.project_repository.get_last_activity_at(project.id)
            items.append(
                ProjectListItem(
                    id=project.id,
                    owner_id=project.owner_id,
                    name=project.name,
                    description=project.description,
                    language=project.language,
                    visibility=project.visibility,
                    member_count=len(project.members) + 1,
                    last_activity_at=last_activity_at,
                    created_at=project.created_at,
                    updated_at=project.updated_at,
                )
            )

        return items

    async def create_project(self, *, user: User, name: str, description: str, language: str) -> ProjectRead:
        project = await self.project_repository.create(
            owner_id=user.id,
            name=name,
            description=description,
            language=language,
        )

        await self.document_repository.create_initial(
            project_id=project.id,
            plain_text="",
            updated_by_user_id=user.id,
        )

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="project.created",
            message=f"{user.full_name} created the project",
            payload={"name": project.name, "language": project.language},
            points=5,
            commit=False,
        )
        await self.session.commit()
        return await self.get_project(project_id=project.id, user=user)

    async def get_project(self, *, project_id: str, user: User) -> ProjectRead:
        project = await self.get_project_model(project_id=project_id, user=user)
        last_activity_at = await self.project_repository.get_last_activity_at(project.id)
        return ProjectRead(
            id=project.id,
            owner_id=project.owner_id,
            name=project.name,
            description=project.description,
            language=project.language,
            visibility=project.visibility,
            created_at=project.created_at,
            updated_at=project.updated_at,
            last_activity_at=last_activity_at,
            member_count=len(project.members) + 1,
            members=self._members_to_schema(project),
            collab_ws_url=f"{settings.collab_url.rstrip('/')}/{project.id}",
        )

    async def get_room_info(self, *, project_id: str, user: User) -> ProjectRoomInfo:
        project = await self.get_project_model(project_id=project_id, user=user)
        document = await self.document_repository.get_by_project_id(project.id)
        current_role = "owner" if project.owner_id == user.id else next(
            (member.role for member in project.members if member.user_id == user.id),
            "viewer",
        )

        return ProjectRoomInfo(
            project=await self.get_project(project_id=project_id, user=user),
            document=ProjectDocumentRead(
                project_id=project.id,
                plain_text=document.plain_text if document else "",
                last_synced_at=document.last_synced_at if document else None,
                ydoc_state_base64=base64.b64encode(document.ydoc_state).decode("utf-8")
                if document and document.ydoc_state
                else None,
            ),
            current_user_role=current_role,
            collab_ws_url=f"{settings.collab_url.rstrip('/')}/{project.id}",
        )

    async def update_project(
        self,
        *,
        project_id: str,
        user: User,
        name: str | None,
        description: str | None,
        language: str | None,
    ) -> ProjectRead:
        project = await self.get_project_model(project_id=project_id, user=user)
        if project.owner_id != user.id:
            raise ForbiddenError("Only the project owner can update project settings.")

        changed: dict[str, object] = {}

        if name is not None and name != project.name:
            changed["name"] = {"from": project.name, "to": name}
            project.name = name
        if description is not None and description != project.description:
            changed["description"] = True
            project.description = description
        if language is not None and language != project.language:
            changed["language"] = {"from": project.language, "to": language}
            project.language = language

        self.session.add(project)

        if changed:
            await self.activity_service.record(
                project_id=project.id,
                actor_user_id=user.id,
                event_type="project.updated",
                message=f"{user.full_name} updated project settings",
                payload=changed,
                points=3,
                commit=False,
            )

        await self.session.commit()
        return await self.get_project(project_id=project.id, user=user)

    async def save_document(
        self,
        *,
        project_id: str,
        user: User,
        plain_text: str,
    ) -> ProjectDocumentUpdateResponse:
        project = await self.get_project_model(project_id=project_id, user=user)
        current_role = "owner" if project.owner_id == user.id else next(
            (member.role for member in project.members if member.user_id == user.id),
            "viewer",
        )

        if current_role == "viewer":
            raise ForbiddenError("Viewers cannot save project code.")

        document = await self.document_repository.update_plain_text(
            project_id=project.id,
            plain_text=plain_text,
            updated_by_user_id=user.id,
        )

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="document.saved",
            message=f"{user.full_name} saved the project code",
            payload={"length": len(plain_text)},
            points=1,
            commit=False,
        )
        await self.session.commit()

        return ProjectDocumentUpdateResponse(
            project_id=document.project_id,
            plain_text=document.plain_text,
            last_synced_at=document.last_synced_at,
            updated_by_user_id=document.updated_by_user_id,
        )

    async def delete_project(self, *, project_id: str, user: User) -> None:
        project = await self.get_project_model(project_id=project_id, user=user)
        if project.owner_id != user.id:
            raise ForbiddenError("Only the project owner can delete the project.")

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="project.deleted",
            message=f"{user.full_name} deleted the project",
            payload={"projectId": project.id},
            points=0,
            commit=False,
        )
        await self.project_repository.delete(project)
        await self.session.commit()