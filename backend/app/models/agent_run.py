from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import RunStatus, RunTrigger


class AgentRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_runs"

    lead_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[RunStatus] = mapped_column(
        SAEnum(RunStatus, name="run_status", native_enum=False, length=32),
        nullable=False,
        default=RunStatus.PENDING,
        index=True,
    )
    trigger: Mapped[RunTrigger] = mapped_column(
        SAEnum(RunTrigger, name="run_trigger", native_enum=False, length=32),
        nullable=False,
        default=RunTrigger.MANUAL,
    )
    plan: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    research: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    qualification: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    outreach: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    crm_proposal: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    report: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lead: Mapped["Lead"] = relationship(back_populates="runs")
    steps: Mapped[list["AgentStep"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="AgentStep.created_at",
    )

    def __repr__(self) -> str:
        return f"AgentRun(id={self.id!s}, status={self.status})"
