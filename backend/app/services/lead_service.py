from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.runner import enqueue_agent_run
from app.core.exceptions import ConflictError, NotFoundError
from app.models.agent_run import AgentRun
from app.models.enums import LeadSource, LeadStatus, RunStatus, RunTrigger
from app.models.lead import Lead
from app.models.user import User
from app.schemas.leads import LeadCreate


class LeadService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: LeadCreate, *, user: User, source: LeadSource) -> Lead:
        lead = Lead(
            email=str(payload.email).lower(),
            full_name=payload.full_name.strip(),
            company=_blank_to_none(payload.company),
            title=_blank_to_none(payload.title),
            website=_blank_to_none(payload.website),
            phone=_blank_to_none(payload.phone),
            notes=_blank_to_none(payload.notes),
            extra=payload.extra,
            source=source,
            status=LeadStatus.NEW,
            created_by_user_id=user.id,
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        if payload.start_run:
            self.start_run(lead.id, user=user, trigger=RunTrigger.MANUAL)
            self.db.refresh(lead)
        return lead

    def create_from_webhook(
        self,
        *,
        email: str,
        full_name: str,
        company: str | None,
        title: str | None,
        website: str | None,
        phone: str | None,
        notes: str | None,
        extra: dict | None,
        external_id: str | None,
        start_run: bool,
    ) -> Lead:
        if external_id:
            existing = self.db.scalar(
                select(Lead).where(Lead.source == LeadSource.N8N, Lead.external_id == external_id)
            )
            if existing is not None:
                return existing
        lead = Lead(
            email=email.lower(),
            full_name=full_name.strip(),
            company=_blank_to_none(company),
            title=_blank_to_none(title),
            website=_blank_to_none(website),
            phone=_blank_to_none(phone),
            notes=_blank_to_none(notes),
            extra=extra,
            source=LeadSource.N8N,
            status=LeadStatus.NEW,
            external_id=external_id,
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        if start_run:
            self.start_run(lead.id, user=None, trigger=RunTrigger.WEBHOOK)
            self.db.refresh(lead)
        return lead

    def get(self, lead_id: UUID) -> Lead:
        lead = self.db.get(Lead, lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.")
        return lead

    def list_leads(
        self,
        *,
        page: int,
        page_size: int,
        status: LeadStatus | None = None,
        source: LeadSource | None = None,
    ) -> tuple[list[Lead], int]:
        stmt = select(Lead)
        count_stmt = select(func.count()).select_from(Lead)
        if status is not None:
            stmt = stmt.where(Lead.status == status)
            count_stmt = count_stmt.where(Lead.status == status)
        if source is not None:
            stmt = stmt.where(Lead.source == source)
            count_stmt = count_stmt.where(Lead.source == source)
        total = int(self.db.scalar(count_stmt) or 0)
        items = list(
            self.db.scalars(
                stmt.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
            ).all()
        )
        return items, total

    def start_run(
        self,
        lead_id: UUID,
        *,
        user: User | None,
        trigger: RunTrigger,
    ) -> AgentRun:
        lead = self.get(lead_id)
        active = self.db.scalar(
            select(AgentRun).where(
                AgentRun.lead_id == lead.id,
                AgentRun.status.in_(
                    [RunStatus.PENDING, RunStatus.RUNNING, RunStatus.WAITING_APPROVAL]
                ),
            )
        )
        if active is not None:
            raise ConflictError("This lead already has an active agent run.")

        run = AgentRun(
            lead_id=lead.id,
            created_by_user_id=user.id if user is not None else None,
            status=RunStatus.PENDING,
            trigger=trigger,
        )
        lead.status = LeadStatus.QUEUED
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        enqueue_agent_run(run.id)
        self.db.refresh(run)
        self.db.refresh(lead)
        return run


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
