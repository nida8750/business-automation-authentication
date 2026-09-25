from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AgentDeployStatus, BillingStatus, IntegrationStatus, InvoiceStatus, PlanCode
from app.models.user import UserRole


class WorkspaceAgentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    category: str
    description: str
    tools: list[str]
    is_core: bool
    status: AgentDeployStatus
    tasks: int = 0
    sla: str | None = None


class WorkspaceAgentListResponse(BaseModel):
    items: list[WorkspaceAgentPublic]
    total: int


class WorkspaceIntegrationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    status: IntegrationStatus
    last_sync_at: datetime | None
    notes: str | None
    env_backed: bool = False


class WorkspaceIntegrationListResponse(BaseModel):
    items: list[WorkspaceIntegrationPublic]
    total: int


class TeamMemberPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    email_verified: bool
    created_at: datetime


class TeamListResponse(BaseModel):
    items: list[TeamMemberPublic]
    total: int


class TeamInviteRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.OPERATOR


class TeamInviteResponse(BaseModel):
    user: TeamMemberPublic
    temporary_password: str


class TeamRoleUpdate(BaseModel):
    role: UserRole
    is_active: bool | None = None


class PlanPublic(BaseModel):
    code: PlanCode
    name: str
    price_cents: int
    period: str
    blurb: str
    items: list[str]
    featured: bool
    cta: str


class PaymentMethodPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    holder_name: str
    is_default: bool
    created_at: datetime


class PaymentMethodCreate(BaseModel):
    holder_name: str = Field(min_length=1, max_length=255)
    card_number: str = Field(min_length=13, max_length=19)
    exp_month: int = Field(ge=1, le=12)
    exp_year: int = Field(ge=2026, le=2100)
    cvc: str = Field(min_length=3, max_length=4)

    @field_validator("card_number")
    @classmethod
    def digits_only(cls, value: str) -> str:
        cleaned = value.replace(" ", "").replace("-", "")
        if not cleaned.isdigit():
            raise ValueError("Card number must contain only digits.")
        return cleaned

    @field_validator("cvc")
    @classmethod
    def cvc_digits(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("CVC must be digits.")
        return value


class InvoicePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plan: PlanCode
    amount_cents: int
    currency: str
    status: InvoiceStatus
    paid_at: datetime | None
    created_at: datetime


class BillingSummary(BaseModel):
    plan: PlanCode
    status: BillingStatus
    current_period_end: datetime | None
    stripe_enabled: bool
    checkout_url: str | None = None
    payment_methods: list[PaymentMethodPublic]
    invoices: list[InvoicePublic]
    plans: list[PlanPublic]


class SubscribeRequest(BaseModel):
    plan: PlanCode
    payment_method_id: UUID | None = None


class SubscribeResponse(BaseModel):
    billing: BillingSummary
    checkout_url: str | None = None
    message: str


class AnalyticsPoint(BaseModel):
    date: str
    runs: int
    tokens: int


class AnalyticsSummary(BaseModel):
    leads_total: int
    runs_total: int
    runs_completed: int
    pending_approvals: int
    outbox_delivered: int
    prompt_tokens: int
    completion_tokens: int
    avg_run_latency_ms: float | None
    hours_returned: float
    estimated_cost_usd: float
    estimated_roi_usd: float
    runs_by_agent: dict[str, int]
    runs_by_status: dict[str, int]
    series: list[AnalyticsPoint]
    kpis: list[dict[str, Any]]
