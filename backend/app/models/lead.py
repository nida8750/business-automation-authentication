from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import LeadSource, LeadStatus


class Lead(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "leads"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(512), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[LeadSource] = mapped_column(
        SAEnum(LeadSource, name="lead_source", native_enum=False, length=32),
        nullable=False,
        default=LeadSource.API,
    )
    status: Mapped[LeadStatus] = mapped_column(
        SAEnum(LeadStatus, name="lead_status", native_enum=False, length=32),
        nullable=False,
        default=LeadStatus.NEW,
        index=True,
    )
    extra: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    runs: Mapped[list["AgentRun"]] = relationship(back_populates="lead")

    def __repr__(self) -> str:
        return f"Lead(id={self.id!s}, email={self.email!r}, status={self.status})"
