from __future__ import annotations

import base64

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.project import Project
from app.models.user import User
from app.repositories.document_repository import DocumentRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.schemas.project import (
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
        self.user_repository = UserRepository(session)
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
                points=2,
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

    async def add_member(self, *, project_id: str, user: User, email: str, role: str) -> ProjectRead:
        project = await self.get_project_model(project_id=project_id, user=user)
        if project.owner_id != user.id:
            raise ForbiddenError("Only the project owner can add members.")

        target_user = await self.user_repository.get_by_email(email)
        if target_user is None:
            raise NotFoundError("User with this email was not found.")

        if target_user.id == project.owner_id:
            raise ConflictError("Project owner is already part of the project.")

        existing_member = await self.project_repository.get_member(project_id=project.id, user_id=target_user.id)
        if existing_member is not None:
            raise ConflictError("This user is already in the project.")

        await self.project_repository.add_member(project_id=project.id, user_id=target_user.id, role=role)
        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="project.member_added",
            message=f"{user.full_name} added {target_user.full_name} to the project",
            payload={"memberUserId": target_user.id, "role": role, "email": target_user.email},
            points=2,
            commit=False,
        )
        await self.session.commit()
        return await self.get_project(project_id=project.id, user=user)

    async def update_member_role(self, *, project_id: str, user: User, member_user_id: str, role: str) -> ProjectRead:
        project = await self.get_project_model(project_id=project_id, user=user)
        if project.owner_id != user.id:
            raise ForbiddenError("Only the project owner can update member roles.")
        if member_user_id == project.owner_id:
            raise ForbiddenError("Owner role cannot be changed.")

        member = await self.project_repository.update_member_role(
            project_id=project.id,
            user_id=member_user_id,
            role=role,
        )
        if member is None:
            raise NotFoundError("Project member not found.")

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="project.member_role_updated",
            message=f"{user.full_name} changed a member role to {role}",
            payload={"memberUserId": member_user_id, "role": role},
            points=1,
            commit=False,
        )
        await self.session.commit()
        return await self.get_project(project_id=project.id, user=user)

    async def remove_member(self, *, project_id: str, user: User, member_user_id: str) -> None:
        project = await self.get_project_model(project_id=project_id, user=user)
        if project.owner_id != user.id:
            raise ForbiddenError("Only the project owner can remove members.")
        if member_user_id == project.owner_id:
            raise ForbiddenError("Project owner cannot be removed.")

        removed = await self.project_repository.remove_member(project_id=project.id, user_id=member_user_id)
        if not removed:
            raise NotFoundError("Project member not found.")

        await self.activity_service.record(
            project_id=project.id,
            actor_user_id=user.id,
            event_type="project.member_removed",
            message=f"{user.full_name} removed a collaborator from the project",
            payload={"memberUserId": member_user_id},
            points=0,
            commit=False,
        )
        await self.session.commit()

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
