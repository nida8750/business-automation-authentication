from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import LeadSource, LeadStatus, RunTrigger


class LeadCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    title: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=512)
    phone: str | None = Field(default=None, max_length=64)
    notes: str | None = None
    extra: dict[str, Any] | None = None
    start_run: bool = True


class LeadPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    company: str | None
    title: str | None
    website: str | None
    phone: str | None
    notes: str | None
    source: LeadSource
    status: LeadStatus
    extra: dict[str, Any] | None
    external_id: str | None
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    items: list[LeadPublic]
    total: int
    page: int
    page_size: int


class StartRunRequest(BaseModel):
    trigger: RunTrigger = RunTrigger.MANUAL


class N8nLeadWebhook(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    title: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=512)
    phone: str | None = Field(default=None, max_length=64)
    notes: str | None = None
    extra: dict[str, Any] | None = None
    external_id: str | None = Field(default=None, max_length=255)
    start_run: bool = True
