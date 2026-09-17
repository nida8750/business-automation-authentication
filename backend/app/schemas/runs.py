from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import AgentName, RunStatus, RunTrigger, StepStatus


class AgentStepPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent: AgentName
    status: StepStatus
    input_payload: dict[str, Any] | None
    output_payload: dict[str, Any] | None
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int | None
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class AgentRunPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    status: RunStatus
    trigger: RunTrigger
    plan: dict[str, Any] | None
    research: dict[str, Any] | None
    qualification: dict[str, Any] | None
    outreach: dict[str, Any] | None
    crm_proposal: dict[str, Any] | None
    report: dict[str, Any] | None
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int | None
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AgentRunDetail(AgentRunPublic):
    steps: list[AgentStepPublic] = []


class AgentRunListResponse(BaseModel):
    items: list[AgentRunPublic]
    total: int
    page: int
    page_size: int
