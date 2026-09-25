from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AgentDeployStatus, BillingStatus, IntegrationStatus, InvoiceStatus, PlanCode


class WorkspaceAgent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workspace_agents"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tools: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    is_core: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[AgentDeployStatus] = mapped_column(
        SAEnum(AgentDeployStatus, name="agent_deploy_status", native_enum=False, length=32),
        nullable=False,
        default=AgentDeployStatus.AVAILABLE,
    )


class WorkspaceIntegration(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workspace_integrations"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IntegrationStatus] = mapped_column(
        SAEnum(IntegrationStatus, name="integration_status", native_enum=False, length=32),
        nullable=False,
        default=IntegrationStatus.AVAILABLE,
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)


class BillingAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "billing_accounts"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    plan: Mapped[PlanCode] = mapped_column(
        SAEnum(PlanCode, name="plan_code", native_enum=False, length=32),
        nullable=False,
        default=PlanCode.STARTER,
    )
    status: Mapped[BillingStatus] = mapped_column(
        SAEnum(BillingStatus, name="billing_status", native_enum=False, length=32),
        nullable=False,
        default=BillingStatus.TRIALING,
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PaymentMethod(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payment_methods"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    brand: Mapped[str] = mapped_column(String(32), nullable=False)
    last4: Mapped[str] = mapped_column(String(4), nullable=False)
    exp_month: Mapped[int] = mapped_column(Integer, nullable=False)
    exp_year: Mapped[int] = mapped_column(Integer, nullable=False)
    holder_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Invoice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "invoices"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plan: Mapped[PlanCode] = mapped_column(
        SAEnum(PlanCode, name="invoice_plan_code", native_enum=False, length=32),
        nullable=False,
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus, name="invoice_status", native_enum=False, length=32),
        nullable=False,
        default=InvoiceStatus.PAID,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_method_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True
    )
