from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, require_roles, require_verified_email
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.workspace import (
    AnalyticsSummary,
    BillingSummary,
    PaymentMethodCreate,
    PaymentMethodPublic,
    PlanPublic,
    SubscribeRequest,
    SubscribeResponse,
    TeamInviteRequest,
    TeamInviteResponse,
    TeamListResponse,
    TeamMemberPublic,
    TeamRoleUpdate,
    WorkspaceAgentListResponse,
    WorkspaceAgentPublic,
    WorkspaceIntegrationListResponse,
    WorkspaceIntegrationPublic,
)
from app.services.workspace_service import PLANS, BillingService, WorkspaceService

agents_router = APIRouter(prefix="/agents", tags=["agents"])
integrations_router = APIRouter(prefix="/integrations", tags=["integrations"])
team_router = APIRouter(prefix="/team", tags=["team"])
billing_router = APIRouter(prefix="/billing", tags=["billing"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])
plans_router = APIRouter(prefix="/billing", tags=["billing"])

_read = require_roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.REVIEWER)
_write = require_roles(UserRole.ADMIN, UserRole.OPERATOR)
_admin = require_roles(UserRole.ADMIN)


def get_workspace(db: Session = Depends(get_db)) -> WorkspaceService:
    return WorkspaceService(db)


def get_billing(db: Session = Depends(get_db)) -> BillingService:
    return BillingService(db)


@agents_router.get("", response_model=WorkspaceAgentListResponse)
def list_agents(
    current_user: User = Depends(_read),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceAgentListResponse:
    _ = current_user
    items = service.list_agents()
    return WorkspaceAgentListResponse(items=items, total=len(items))


@agents_router.post("/{slug}/deploy", response_model=WorkspaceAgentPublic)
def deploy_agent(
    slug: str,
    current_user: User = Depends(_write),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceAgentPublic:
    _ = current_user
    return service.set_agent(slug, deployed=True)


@agents_router.post("/{slug}/pause", response_model=WorkspaceAgentPublic)
def pause_agent(
    slug: str,
    current_user: User = Depends(_write),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceAgentPublic:
    _ = current_user
    return service.set_agent(slug, deployed=False)


@integrations_router.get("", response_model=WorkspaceIntegrationListResponse)
def list_integrations(
    current_user: User = Depends(_read),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceIntegrationListResponse:
    _ = current_user
    items = service.list_integrations()
    return WorkspaceIntegrationListResponse(items=items, total=len(items))


@integrations_router.post("/{slug}/connect", response_model=WorkspaceIntegrationPublic)
def connect_integration(
    slug: str,
    current_user: User = Depends(_write),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceIntegrationPublic:
    _ = current_user
    return service.set_integration(slug, connected=True)


@integrations_router.post("/{slug}/disconnect", response_model=WorkspaceIntegrationPublic)
def disconnect_integration(
    slug: str,
    current_user: User = Depends(_write),
    service: WorkspaceService = Depends(get_workspace),
) -> WorkspaceIntegrationPublic:
    _ = current_user
    return service.set_integration(slug, connected=False)


@team_router.get("", response_model=TeamListResponse)
def list_team(
    current_user: User = Depends(_read),
    service: WorkspaceService = Depends(get_workspace),
) -> TeamListResponse:
    _ = current_user
    items = service.list_team()
    return TeamListResponse(items=items, total=len(items))


@team_router.post("/invite", response_model=TeamInviteResponse)
def invite_team(
    payload: TeamInviteRequest,
    current_user: User = Depends(_admin),
    service: WorkspaceService = Depends(get_workspace),
) -> TeamInviteResponse:
    return service.invite(actor=current_user, email=str(payload.email), full_name=payload.full_name, role=payload.role)


@team_router.patch("/{user_id}", response_model=TeamMemberPublic)
def update_team_member(
    user_id: UUID,
    payload: TeamRoleUpdate,
    current_user: User = Depends(_admin),
    service: WorkspaceService = Depends(get_workspace),
) -> TeamMemberPublic:
    return service.update_member(actor=current_user, user_id=user_id, role=payload.role, is_active=payload.is_active)


@analytics_router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    current_user: User = Depends(_read),
    service: WorkspaceService = Depends(get_workspace),
) -> AnalyticsSummary:
    _ = current_user
    return service.analytics()


@plans_router.get("/plans", response_model=list[PlanPublic])
def list_plans() -> list[PlanPublic]:
    return PLANS


@billing_router.get("/summary", response_model=BillingSummary)
def billing_summary(
    current_user: User = Depends(require_verified_email),
    service: BillingService = Depends(get_billing),
) -> BillingSummary:
    return service.summary(current_user)


@billing_router.post("/payment-methods", response_model=PaymentMethodPublic)
def add_payment_method(
    payload: PaymentMethodCreate,
    current_user: User = Depends(require_verified_email),
    service: BillingService = Depends(get_billing),
) -> PaymentMethodPublic:
    return service.add_payment_method(current_user, payload)


@billing_router.delete("/payment-methods/{method_id}", status_code=204)
def delete_payment_method(
    method_id: UUID,
    current_user: User = Depends(require_verified_email),
    service: BillingService = Depends(get_billing),
) -> None:
    service.delete_payment_method(current_user, method_id)


@billing_router.post("/subscribe", response_model=SubscribeResponse)
def subscribe(
    payload: SubscribeRequest,
    current_user: User = Depends(require_verified_email),
    service: BillingService = Depends(get_billing),
) -> SubscribeResponse:
    return service.subscribe(current_user, payload.plan, payload.payment_method_id)


@billing_router.post("/cancel", response_model=BillingSummary)
def cancel_billing(
    current_user: User = Depends(require_verified_email),
    service: BillingService = Depends(get_billing),
) -> BillingSummary:
    return service.cancel(current_user)
