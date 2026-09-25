"""workspace agents, integrations, billing, payment methods, invoices

Revision ID: 0005_workspace_billing
Revises: 0004_leads_pipeline
Create Date: 2026-09-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_workspace_billing"
down_revision: Union[str, Sequence[str], None] = "0004_leads_pipeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspace_agents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tools", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_core", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="available"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspace_agents_slug"), "workspace_agents", ["slug"], unique=True)

    op.create_table(
        "workspace_integrations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="available"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(length=512), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspace_integrations_slug"), "workspace_integrations", ["slug"], unique=True)

    op.create_table(
        "billing_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan", sa.String(length=32), nullable=False, server_default="starter"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="trialing"),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_accounts_user_id"), "billing_accounts", ["user_id"], unique=True)

    op.create_table(
        "payment_methods",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("brand", sa.String(length=32), nullable=False),
        sa.Column("last4", sa.String(length=4), nullable=False),
        sa.Column("exp_month", sa.Integer(), nullable=False),
        sa.Column("exp_year", sa.Integer(), nullable=False),
        sa.Column("holder_name", sa.String(length=255), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payment_methods_user_id"), "payment_methods", ["user_id"], unique=False)

    op.create_table(
        "invoices",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan", sa.String(length=32), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="paid"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_method_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payment_method_id"], ["payment_methods.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_user_id"), "invoices", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_invoices_user_id"), table_name="invoices")
    op.drop_table("invoices")
    op.drop_index(op.f("ix_payment_methods_user_id"), table_name="payment_methods")
    op.drop_table("payment_methods")
    op.drop_index(op.f("ix_billing_accounts_user_id"), table_name="billing_accounts")
    op.drop_table("billing_accounts")
    op.drop_index(op.f("ix_workspace_integrations_slug"), table_name="workspace_integrations")
    op.drop_table("workspace_integrations")
    op.drop_index(op.f("ix_workspace_agents_slug"), table_name="workspace_agents")
    op.drop_table("workspace_agents")
