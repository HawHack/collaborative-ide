from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import db_session, get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectDocumentUpdateRequest,
    ProjectDocumentUpdateResponse,
    ProjectListItem,
    ProjectMemberInviteRequest,
    ProjectMemberRoleUpdateRequest,
    ProjectRead,
    ProjectRoomInfo,
    ProjectUpdateRequest,
)
from app.services.project_service import ProjectService

router = APIRouter()


@router.get("", response_model=list[ProjectListItem])
async def list_projects(
    search: str | None = Query(default=None, max_length=120),
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> list[ProjectListItem]:
    return await ProjectService(session).list_projects(user=current_user, search=search)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreateRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    return await ProjectService(session).create_project(
        user=current_user,
        name=payload.name,
        description=payload.description,
        language=payload.language,
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    return await ProjectService(session).get_project(project_id=project_id, user=current_user)


@router.get("/{project_id}/room", response_model=ProjectRoomInfo)
async def get_project_room(
    project_id: str,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRoomInfo:
    return await ProjectService(session).get_room_info(project_id=project_id, user=current_user)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    return await ProjectService(session).update_project(
        project_id=project_id,
        user=current_user,
        name=payload.name,
        description=payload.description,
        language=payload.language,
    )


@router.put("/{project_id}/document", response_model=ProjectDocumentUpdateResponse)
async def update_project_document(
    project_id: str,
    payload: ProjectDocumentUpdateRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectDocumentUpdateResponse:
    return await ProjectService(session).save_document(
        project_id=project_id,
        user=current_user,
        plain_text=payload.plain_text,
    )


@router.post("/{project_id}/members", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: str,
    payload: ProjectMemberInviteRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    return await ProjectService(session).add_member(
        project_id=project_id,
        user=current_user,
        email=payload.email,
        role=payload.role,
    )


@router.patch("/{project_id}/members/{member_user_id}", response_model=ProjectRead)
async def update_project_member_role(
    project_id: str,
    member_user_id: str,
    payload: ProjectMemberRoleUpdateRequest,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    return await ProjectService(session).update_member_role(
        project_id=project_id,
        user=current_user,
        member_user_id=member_user_id,
        role=payload.role,
    )


@router.delete("/{project_id}/members/{member_user_id}", response_model=MessageResponse)
async def remove_project_member(
    project_id: str,
    member_user_id: str,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    await ProjectService(session).remove_member(
        project_id=project_id,
        user=current_user,
        member_user_id=member_user_id,
    )
    return MessageResponse(message="Member removed successfully.")


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    await ProjectService(session).delete_project(project_id=project_id, user=current_user)
    return MessageResponse(message="Project deleted successfully.")
