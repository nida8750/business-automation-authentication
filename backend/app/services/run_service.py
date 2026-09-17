from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.agent_run import AgentRun
from app.models.enums import LeadStatus, RunStatus
from app.models.lead import Lead


class RunService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, run_id: UUID) -> AgentRun:
        run = self.db.scalar(
            select(AgentRun).options(selectinload(AgentRun.steps)).where(AgentRun.id == run_id)
        )
        if run is None:
            raise NotFoundError("Agent run not found.")
        return run

    def list_runs(
        self,
        *,
        page: int,
        page_size: int,
        lead_id: UUID | None = None,
        status: RunStatus | None = None,
    ) -> tuple[list[AgentRun], int]:
        stmt = select(AgentRun)
        count_stmt = select(func.count()).select_from(AgentRun)
        if lead_id is not None:
            stmt = stmt.where(AgentRun.lead_id == lead_id)
            count_stmt = count_stmt.where(AgentRun.lead_id == lead_id)
        if status is not None:
            stmt = stmt.where(AgentRun.status == status)
            count_stmt = count_stmt.where(AgentRun.status == status)
        total = int(self.db.scalar(count_stmt) or 0)
        items = list(
            self.db.scalars(
                stmt.order_by(AgentRun.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return items, total

    def cancel(self, run_id: UUID) -> AgentRun:
        run = self.get(run_id)
        if run.status in {RunStatus.COMPLETED, RunStatus.FAILED, RunStatus.CANCELLED}:
            raise BadRequestError("This run is already finished.")
        run.status = RunStatus.CANCELLED
        lead = self.db.get(Lead, run.lead_id)
        if lead is not None and lead.status in {
            LeadStatus.QUEUED,
            LeadStatus.RUNNING,
            LeadStatus.AWAITING_APPROVAL,
        }:
            lead.status = LeadStatus.REJECTED
        self.db.commit()
        self.db.refresh(run)
        return run
