from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.approval import Approval
from app.models.enums import ApprovalStatus, OutboxStatus, RunStatus
from app.models.lead import Lead
from app.models.outbox import OutboxEvent
from app.schemas.approvals import DashboardSummary


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def summary(self) -> DashboardSummary:
        leads_total = int(self.db.scalar(select(func.count()).select_from(Lead)) or 0)
        runs_total = int(self.db.scalar(select(func.count()).select_from(AgentRun)) or 0)
        leads_by_status = {
            (status.value if hasattr(status, "value") else str(status)): int(count)
            for status, count in self.db.execute(
                select(Lead.status, func.count()).group_by(Lead.status)
            )
        }
        runs_by_status = {
            (status.value if hasattr(status, "value") else str(status)): int(count)
            for status, count in self.db.execute(
                select(AgentRun.status, func.count()).group_by(AgentRun.status)
            )
        }
        pending_approvals = int(
            self.db.scalar(
                select(func.count())
                .select_from(Approval)
                .where(Approval.status == ApprovalStatus.PENDING)
            )
            or 0
        )
        outbox_pending = int(
            self.db.scalar(
                select(func.count())
                .select_from(OutboxEvent)
                .where(OutboxEvent.status == OutboxStatus.PENDING)
            )
            or 0
        )
        outbox_delivered = int(
            self.db.scalar(
                select(func.count())
                .select_from(OutboxEvent)
                .where(OutboxEvent.status == OutboxStatus.DELIVERED)
            )
            or 0
        )
        prompt_tokens = int(self.db.scalar(select(func.coalesce(func.sum(AgentRun.prompt_tokens), 0))) or 0)
        completion_tokens = int(
            self.db.scalar(select(func.coalesce(func.sum(AgentRun.completion_tokens), 0))) or 0
        )
        avg_latency = self.db.scalar(
            select(func.avg(AgentRun.latency_ms)).where(
                AgentRun.status == RunStatus.COMPLETED,
                AgentRun.latency_ms.is_not(None),
            )
        )
        return DashboardSummary(
            leads_total=leads_total,
            leads_by_status=leads_by_status,
            runs_total=runs_total,
            runs_by_status=runs_by_status,
            pending_approvals=pending_approvals,
            outbox_pending=outbox_pending,
            outbox_delivered=outbox_delivered,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            avg_run_latency_ms=float(avg_latency) if avg_latency is not None else None,
        )
