from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.enums import LeadSource, LeadStatus, RunTrigger
from app.models.user import User, UserRole
from app.schemas.leads import LeadCreate, LeadListResponse, LeadPublic
from app.schemas.runs import AgentRunPublic
from app.services.lead_service import LeadService

router = APIRouter(prefix="/leads", tags=["leads"])

_write_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR)
_read_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.REVIEWER)


def get_lead_service(db: Session = Depends(get_db)) -> LeadService:
    return LeadService(db)


@router.post("", response_model=LeadPublic, status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    current_user: User = Depends(_write_roles),
    service: LeadService = Depends(get_lead_service),
) -> LeadPublic:
    lead = service.create(payload, user=current_user, source=LeadSource.APP)
    return LeadPublic.model_validate(lead)


@router.get("", response_model=LeadListResponse)
def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: LeadStatus | None = Query(default=None, alias="status"),
    source: LeadSource | None = None,
    current_user: User = Depends(_read_roles),
    service: LeadService = Depends(get_lead_service),
) -> LeadListResponse:
    _ = current_user
    items, total = service.list_leads(
        page=page,
        page_size=page_size,
        status=status_filter,
        source=source,
    )
    return LeadListResponse(
        items=[LeadPublic.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{lead_id}", response_model=LeadPublic)
def get_lead(
    lead_id: UUID,
    current_user: User = Depends(_read_roles),
    service: LeadService = Depends(get_lead_service),
) -> LeadPublic:
    _ = current_user
    return LeadPublic.model_validate(service.get(lead_id))


@router.post("/{lead_id}/runs", response_model=AgentRunPublic, status_code=status.HTTP_201_CREATED)
def start_lead_run(
    lead_id: UUID,
    current_user: User = Depends(_write_roles),
    service: LeadService = Depends(get_lead_service),
) -> AgentRunPublic:
    run = service.start_run(lead_id, user=current_user, trigger=RunTrigger.MANUAL)
    return AgentRunPublic.model_validate(run)
