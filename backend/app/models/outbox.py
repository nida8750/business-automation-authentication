from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import OutboxStatus, OutboxType


class OutboxEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Durable outbound actions. Approval writes a row; dispatch marks it delivered or failed."""

    __tablename__ = "outbox_events"

    run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    approval_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[OutboxType] = mapped_column(
        SAEnum(OutboxType, name="outbox_type", native_enum=False, length=32),
        nullable=False,
    )
    status: Mapped[OutboxStatus] = mapped_column(
        SAEnum(OutboxStatus, name="outbox_status", native_enum=False, length=32),
        nullable=False,
        default=OutboxStatus.PENDING,
        index=True,
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
