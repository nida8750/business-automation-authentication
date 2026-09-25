from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AgentName, StepStatus


class AgentStep(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_steps"

    run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agent: Mapped[AgentName] = mapped_column(
        SAEnum(AgentName, name="agent_name", native_enum=False, length=32),
        nullable=False,
        index=True,
    )
    status: Mapped[StepStatus] = mapped_column(
        SAEnum(StepStatus, name="step_status", native_enum=False, length=32),
        nullable=False,
        default=StepStatus.PENDING,
    )
    input_payload: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    output_payload: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["AgentRun"] = relationship(back_populates="steps")
