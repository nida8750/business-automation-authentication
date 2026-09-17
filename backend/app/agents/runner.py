from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.graph import agent_graph
from app.config import settings
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.integrations.outbox_dispatch import dispatch_crm_write, dispatch_send_email
from app.models.agent_run import AgentRun
from app.models.agent_step import AgentStep
from app.models.approval import Approval
from app.models.enums import (
    AgentName,
    ApprovalStatus,
    ApprovalType,
    LeadStatus,
    OutboxStatus,
    OutboxType,
    RunStatus,
    StepStatus,
)
from app.models.lead import Lead
from app.models.outbox import OutboxEvent

logger = get_logger("agents.runner")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _lead_dict(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "email": lead.email,
        "full_name": lead.full_name,
        "company": lead.company,
        "title": lead.title,
        "website": lead.website,
        "phone": lead.phone,
        "notes": lead.notes,
        "source": lead.source.value if lead.source else None,
        "extra": lead.extra,
    }


def run_agent_pipeline(run_id: str) -> None:
    """Execute the LangGraph pipeline for one run and persist steps, approvals, or outbox rows."""
    db = SessionLocal()
    try:
        run = db.get(AgentRun, UUID(run_id))
        if run is None:
            logger.warning("agent_run_missing", extra={"extra_data": {"run_id": run_id}})
            return
        if run.status in {RunStatus.COMPLETED, RunStatus.CANCELLED}:
            return

        lead = db.get(Lead, run.lead_id)
        if lead is None:
            run.status = RunStatus.FAILED
            run.error_message = "Lead was deleted before the run started."
            run.finished_at = _utcnow()
            db.commit()
            return

        run.status = RunStatus.RUNNING
        run.started_at = run.started_at or _utcnow()
        lead.status = LeadStatus.RUNNING
        db.commit()

        started = datetime.now(timezone.utc)
        try:
            result = agent_graph.invoke(
                {
                    "lead": _lead_dict(lead),
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "steps": [],
                    "errors": [],
                    "skip_outreach": False,
                }
            )
        except Exception as exc:
            logger.exception("agent_graph_failed")
            run.status = RunStatus.FAILED
            run.error_message = str(exc)
            run.finished_at = _utcnow()
            lead.status = LeadStatus.FAILED
            db.commit()
            return

        _persist_graph_result(db, run, lead, result, started)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("agent_pipeline_failed", extra={"extra_data": {"run_id": run_id}})
        raise
    finally:
        db.close()


def _persist_graph_result(
    db: Session,
    run: AgentRun,
    lead: Lead,
    result: dict,
    started: datetime,
) -> None:
    run.plan = result.get("plan")
    run.research = result.get("research")
    run.qualification = result.get("qualification")
    run.outreach = result.get("outreach")
    run.crm_proposal = result.get("crm_proposal")
    run.report = result.get("report")
    run.prompt_tokens = int(result.get("prompt_tokens") or 0)
    run.completion_tokens = int(result.get("completion_tokens") or 0)
    run.latency_ms = int((_utcnow() - started).total_seconds() * 1000)

    for raw in result.get("steps") or []:
        db.add(
            AgentStep(
                run_id=run.id,
                agent=AgentName(raw["agent"]),
                status=StepStatus(raw["status"]),
                input_payload=raw.get("input_payload"),
                output_payload=raw.get("output_payload"),
                prompt_tokens=int(raw.get("prompt_tokens") or 0),
                completion_tokens=int(raw.get("completion_tokens") or 0),
                latency_ms=raw.get("latency_ms"),
                error_message=raw.get("error_message"),
                started_at=started,
                finished_at=_utcnow(),
            )
        )

    skip = bool(result.get("skip_outreach"))
    if skip:
        run.status = RunStatus.COMPLETED
        run.finished_at = _utcnow()
        lead.status = LeadStatus.COMPLETED
        return

    created_approval = False
    if settings.require_approval_for_email and run.outreach:
        db.add(
            Approval(
                run_id=run.id,
                lead_id=lead.id,
                action_type=ApprovalType.SEND_EMAIL,
                status=ApprovalStatus.PENDING,
                payload=run.outreach,
            )
        )
        created_approval = True
    elif run.outreach:
        _queue_outbox(db, run.id, None, OutboxType.SEND_EMAIL, run.outreach)

    if settings.require_approval_for_crm and run.crm_proposal:
        db.add(
            Approval(
                run_id=run.id,
                lead_id=lead.id,
                action_type=ApprovalType.CRM_WRITE,
                status=ApprovalStatus.PENDING,
                payload=run.crm_proposal,
            )
        )
        created_approval = True
    elif run.crm_proposal:
        _queue_outbox(db, run.id, None, OutboxType.CRM_WRITE, run.crm_proposal)

    db.flush()
    if created_approval:
        run.status = RunStatus.WAITING_APPROVAL
        lead.status = LeadStatus.AWAITING_APPROVAL
        return

    dispatch_pending_outbox(db, run.id)
    run.status = RunStatus.COMPLETED
    run.finished_at = _utcnow()
    lead.status = LeadStatus.COMPLETED


def _queue_outbox(
    db: Session,
    run_id: UUID,
    approval_id: UUID | None,
    event_type: OutboxType,
    payload: dict,
) -> OutboxEvent:
    event = OutboxEvent(
        run_id=run_id,
        approval_id=approval_id,
        event_type=event_type,
        status=OutboxStatus.PENDING,
        payload=payload,
    )
    db.add(event)
    db.flush()
    return event


def dispatch_pending_outbox(db: Session, run_id: UUID) -> None:
    events = list(
        db.scalars(
            select(OutboxEvent).where(
                OutboxEvent.run_id == run_id,
                OutboxEvent.status == OutboxStatus.PENDING,
            )
        ).all()
    )
    for event in events:
        dispatch_outbox_event(db, event)


def dispatch_outbox_event(db: Session, event: OutboxEvent) -> None:
    event.status = OutboxStatus.PROCESSING
    event.attempts += 1
    db.flush()
    try:
        if event.event_type == OutboxType.SEND_EMAIL:
            result = dispatch_send_email(event.payload)
        else:
            result = dispatch_crm_write(event.payload)
        payload = dict(event.payload or {})
        payload["dispatch_result"] = result
        event.payload = payload
        event.status = OutboxStatus.DELIVERED
        event.processed_at = _utcnow()
        event.last_error = None
    except Exception as exc:
        logger.exception("outbox_dispatch_failed")
        event.status = OutboxStatus.FAILED
        event.last_error = str(exc)
        event.processed_at = _utcnow()


def enqueue_agent_run(run_id: UUID) -> None:
    from app.workers.tasks import execute_agent_run

    if settings.celery_task_always_eager:
        execute_agent_run.apply(args=[str(run_id)])
        return
    try:
        execute_agent_run.delay(str(run_id))
    except Exception:
        logger.exception("celery_enqueue_failed_running_inline")
        execute_agent_run.apply(args=[str(run_id)])
