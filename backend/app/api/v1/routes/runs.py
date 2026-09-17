from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.enums import RunStatus
from app.models.user import User, UserRole
from app.schemas.runs import AgentRunDetail, AgentRunListResponse, AgentRunPublic, AgentStepPublic
from app.services.run_service import RunService

router = APIRouter(prefix="/runs", tags=["runs"])

_read_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.REVIEWER)
_write_roles = require_roles(UserRole.ADMIN, UserRole.OPERATOR)


def get_run_service(db: Session = Depends(get_db)) -> RunService:
    return RunService(db)


@router.get("", response_model=AgentRunListResponse)
def list_runs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    lead_id: UUID | None = None,
    status_filter: RunStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(_read_roles),
    service: RunService = Depends(get_run_service),
) -> AgentRunListResponse:
    _ = current_user
    items, total = service.list_runs(
        page=page,
        page_size=page_size,
        lead_id=lead_id,
        status=status_filter,
    )
    return AgentRunListResponse(
        items=[AgentRunPublic.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{run_id}", response_model=AgentRunDetail)
def get_run(
    run_id: UUID,
    current_user: User = Depends(_read_roles),
    service: RunService = Depends(get_run_service),
) -> AgentRunDetail:
    _ = current_user
    run = service.get(run_id)
    return AgentRunDetail(
        **AgentRunPublic.model_validate(run).model_dump(),
        steps=[AgentStepPublic.model_validate(step) for step in run.steps],
    )


@router.post("/{run_id}/cancel", response_model=AgentRunPublic)
def cancel_run(
    run_id: UUID,
    current_user: User = Depends(_write_roles),
    service: RunService = Depends(get_run_service),
) -> AgentRunPublic:
    _ = current_user
    return AgentRunPublic.model_validate(service.cancel(run_id))
