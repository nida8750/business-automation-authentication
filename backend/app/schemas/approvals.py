from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ApprovalStatus, ApprovalType, OutboxStatus, OutboxType


class ApprovalDecideRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class ApprovalPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    lead_id: UUID
    action_type: ApprovalType
    status: ApprovalStatus
    payload: dict[str, Any]
    reason: str | None
    decided_by_user_id: UUID | None
    decided_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ApprovalListResponse(BaseModel):
    items: list[ApprovalPublic]
    total: int
    page: int
    page_size: int


class OutboxPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    approval_id: UUID | None
    event_type: OutboxType
    status: OutboxStatus
    payload: dict[str, Any]
    attempts: int
    last_error: str | None
    processed_at: datetime | None
    created_at: datetime


class OutboxListResponse(BaseModel):
    items: list[OutboxPublic]
    total: int
    page: int
    page_size: int


class DashboardSummary(BaseModel):
    leads_total: int
    leads_by_status: dict[str, int]
    runs_total: int
    runs_by_status: dict[str, int]
    pending_approvals: int
    outbox_pending: int
    outbox_delivered: int
    prompt_tokens: int
    completion_tokens: int
    avg_run_latency_ms: float | None
