from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.enums import ApprovalStatus, OutboxStatus
from app.models.user import User, UserRole
from app.schemas.approvals import (
    ApprovalDecideRequest,
    ApprovalListResponse,
    ApprovalPublic,
    DashboardSummary,
    OutboxListResponse,
    OutboxPublic,
)
from app.services.approval_service import ApprovalService, OutboxService
from app.services.dashboard_service import DashboardService

approvals_router = APIRouter(prefix="/approvals", tags=["approvals"])
outbox_router = APIRouter(prefix="/outbox", tags=["outbox"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_review_roles = require_roles(UserRole.ADMIN, UserRole.REVIEWER)
_read_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.REVIEWER)
_ops_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR)


def get_approval_service(db: Session = Depends(get_db)) -> ApprovalService:
    return ApprovalService(db)


def get_outbox_service(db: Session = Depends(get_db)) -> OutboxService:
    return OutboxService(db)


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@approvals_router.get("", response_model=ApprovalListResponse)
def list_approvals(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: ApprovalStatus | None = Query(default=None, alias="status"),
    lead_id: UUID | None = None,
    current_user: User = Depends(_review_roles),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalListResponse:
    _ = current_user
    items, total = service.list_approvals(
        page=page, page_size=page_size, status=status_filter, lead_id=lead_id
    )
    return ApprovalListResponse(
        items=[ApprovalPublic.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@approvals_router.get("/{approval_id}", response_model=ApprovalPublic)
def get_approval(
    approval_id: UUID,
    current_user: User = Depends(_review_roles),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalPublic:
    _ = current_user
    return ApprovalPublic.model_validate(service.get(approval_id))


@approvals_router.post("/{approval_id}/approve", response_model=ApprovalPublic)
def approve(
    approval_id: UUID,
    payload: ApprovalDecideRequest,
    current_user: User = Depends(_review_roles),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalPublic:
    return ApprovalPublic.model_validate(
        service.decide(approval_id, user=current_user, approved=True, reason=payload.reason)
    )


@approvals_router.post("/{approval_id}/reject", response_model=ApprovalPublic)
def reject(
    approval_id: UUID,
    payload: ApprovalDecideRequest,
    current_user: User = Depends(_review_roles),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalPublic:
    return ApprovalPublic.model_validate(
        service.decide(approval_id, user=current_user, approved=False, reason=payload.reason)
    )


@outbox_router.get("", response_model=OutboxListResponse)
def list_outbox(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: OutboxStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(_ops_roles),
    service: OutboxService = Depends(get_outbox_service),
) -> OutboxListResponse:
    _ = current_user
    items, total = service.list_events(page=page, page_size=page_size, status=status_filter)
    return OutboxListResponse(
        items=[OutboxPublic.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@outbox_router.post("/{event_id}/retry", response_model=OutboxPublic)
def retry_outbox(
    event_id: UUID,
    current_user: User = Depends(_ops_roles),
    service: OutboxService = Depends(get_outbox_service),
) -> OutboxPublic:
    _ = current_user
    return OutboxPublic.model_validate(service.retry(event_id))


@dashboard_router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    current_user: User = Depends(_read_roles),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    _ = current_user
    return service.summary()
