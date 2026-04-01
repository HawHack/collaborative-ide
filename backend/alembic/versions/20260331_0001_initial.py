"""initial schema

Revision ID: 20260331_0001
Revises: None
Create Date: 2026-03-31 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260331_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("avatar_color", sa.String(length=16), nullable=False, server_default="#4f46e5"),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "projects",
        sa.Column("owner_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("language", sa.String(length=32), nullable=False, server_default="python"),
        sa.Column("visibility", sa.String(length=16), nullable=False, server_default="private"),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name="fk_projects_owner_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"], unique=False)

    op.create_table(
        "project_members",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="editor"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_project_members_project_id_projects", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_project_members_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id", name="pk_project_members"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_members_project_id_user_id"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_refresh_tokens_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
        sa.UniqueConstraint("token_jti", name="uq_refresh_tokens_token_jti"),
    )
    op.create_index("ix_refresh_tokens_user_id_revoked_at", "refresh_tokens", ["user_id", "revoked_at"], unique=False)

    op.create_table(
        "project_documents",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("plain_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("ydoc_state", postgresql.BYTEA(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_project_documents_project_id_projects", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], name="fk_project_documents_updated_by_user_id_users", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("project_id", name="pk_project_documents"),
    )

    op.create_table(
        "activity_events",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], name="fk_activity_events_actor_user_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_activity_events_project_id_projects", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_activity_events"),
    )
    op.create_index("ix_activity_events_project_id", "activity_events", ["project_id"], unique=False)
    op.create_index("ix_activity_events_project_id_created_at", "activity_events", ["project_id", "created_at"], unique=False)

    op.create_table(
        "execution_runs",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("source_code", sa.Text(), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=False, server_default=""),
        sa.Column("stderr", sa.Text(), nullable=False, server_default=""),
        sa.Column("combined_output", sa.Text(), nullable=False, server_default=""),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("limits", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], name="fk_execution_runs_actor_user_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_execution_runs_project_id_projects", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_execution_runs"),
    )
    op.create_index("ix_execution_runs_project_id_started_at", "execution_runs", ["project_id", "started_at"], unique=False)

    op.create_table(
        "ai_review_records",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("suggestions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("merge_suggestion", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("raw_response", sa.Text(), nullable=False, server_default=""),
        sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], name="fk_ai_review_records_actor_user_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_ai_review_records_project_id_projects", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_review_records"),
    )
    op.create_index("ix_ai_review_records_project_id_created_at", "ai_review_records", ["project_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_review_records_project_id_created_at", table_name="ai_review_records")
    op.drop_table("ai_review_records")
    op.drop_index("ix_execution_runs_project_id_started_at", table_name="execution_runs")
    op.drop_table("execution_runs")
    op.drop_index("ix_activity_events_project_id_created_at", table_name="activity_events")
    op.drop_index("ix_activity_events_project_id", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_table("project_documents")
    op.drop_index("ix_refresh_tokens_user_id_revoked_at", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("project_members")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_table("projects")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")