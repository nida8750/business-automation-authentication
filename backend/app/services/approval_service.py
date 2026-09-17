from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.runner import dispatch_outbox_event, dispatch_pending_outbox
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.agent_run import AgentRun
from app.models.approval import Approval
from app.models.enums import (
    ApprovalStatus,
    ApprovalType,
    LeadStatus,
    OutboxStatus,
    OutboxType,
    RunStatus,
)
from app.models.lead import Lead
from app.models.outbox import OutboxEvent
from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ApprovalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, approval_id: UUID) -> Approval:
        approval = self.db.get(Approval, approval_id)
        if approval is None:
            raise NotFoundError("Approval not found.")
        return approval

    def list_approvals(
        self,
        *,
        page: int,
        page_size: int,
        status: ApprovalStatus | None = None,
        lead_id: UUID | None = None,
    ) -> tuple[list[Approval], int]:
        stmt = select(Approval)
        count_stmt = select(func.count()).select_from(Approval)
        if status is not None:
            stmt = stmt.where(Approval.status == status)
            count_stmt = count_stmt.where(Approval.status == status)
        if lead_id is not None:
            stmt = stmt.where(Approval.lead_id == lead_id)
            count_stmt = count_stmt.where(Approval.lead_id == lead_id)
        total = int(self.db.scalar(count_stmt) or 0)
        items = list(
            self.db.scalars(
                stmt.order_by(Approval.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return items, total

    def decide(
        self,
        approval_id: UUID,
        *,
        user: User,
        approved: bool,
        reason: str | None,
    ) -> Approval:
        approval = self.get(approval_id)
        if approval.status != ApprovalStatus.PENDING:
            raise BadRequestError("This approval has already been decided.")

        approval.status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        approval.reason = (reason or "").strip() or None
        approval.decided_by_user_id = user.id
        approval.decided_at = _utcnow()

        if approved:
            event_type = (
                OutboxType.SEND_EMAIL
                if approval.action_type == ApprovalType.SEND_EMAIL
                else OutboxType.CRM_WRITE
            )
            self.db.add(
                OutboxEvent(
                    run_id=approval.run_id,
                    approval_id=approval.id,
                    event_type=event_type,
                    status=OutboxStatus.PENDING,
                    payload=approval.payload,
                )
            )
        self.db.flush()
        self._maybe_finalize_run(approval.run_id)
        self.db.commit()
        self.db.refresh(approval)
        return approval

    def _maybe_finalize_run(self, run_id: UUID) -> None:
        pending = self.db.scalar(
            select(func.count())
            .select_from(Approval)
            .where(Approval.run_id == run_id, Approval.status == ApprovalStatus.PENDING)
        )
        if int(pending or 0) > 0:
            return

        dispatch_pending_outbox(self.db, run_id)
        run = self.db.get(AgentRun, run_id)
        lead = self.db.get(Lead, run.lead_id) if run is not None else None
        if run is None or lead is None:
            return

        approved = self.db.scalar(
            select(func.count())
            .select_from(Approval)
            .where(Approval.run_id == run_id, Approval.status == ApprovalStatus.APPROVED)
        )
        if int(approved or 0) == 0:
            run.status = RunStatus.COMPLETED
            run.finished_at = _utcnow()
            lead.status = LeadStatus.REJECTED
            return

        run.status = RunStatus.COMPLETED
        run.finished_at = _utcnow()
        failed_outbox = self.db.scalar(
            select(func.count())
            .select_from(OutboxEvent)
            .where(OutboxEvent.run_id == run_id, OutboxEvent.status == OutboxStatus.FAILED)
        )
        lead.status = LeadStatus.FAILED if int(failed_outbox or 0) else LeadStatus.COMPLETED


class OutboxService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_events(
        self,
        *,
        page: int,
        page_size: int,
        status: OutboxStatus | None = None,
    ) -> tuple[list[OutboxEvent], int]:
        stmt = select(OutboxEvent)
        count_stmt = select(func.count()).select_from(OutboxEvent)
        if status is not None:
            stmt = stmt.where(OutboxEvent.status == status)
            count_stmt = count_stmt.where(OutboxEvent.status == status)
        total = int(self.db.scalar(count_stmt) or 0)
        items = list(
            self.db.scalars(
                stmt.order_by(OutboxEvent.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return items, total

    def retry(self, event_id: UUID) -> OutboxEvent:
        event = self.db.get(OutboxEvent, event_id)
        if event is None:
            raise NotFoundError("Outbox event not found.")
        if event.status not in {OutboxStatus.FAILED, OutboxStatus.PENDING}:
            raise BadRequestError("Only pending or failed outbox events can be retried.")
        event.status = OutboxStatus.PENDING
        dispatch_outbox_event(self.db, event)
        self.db.commit()
        self.db.refresh(event)
        return event
