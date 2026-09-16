from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import DateTime, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
class Base(DeclarativeBase):
    """Root declarative class. All ORM models inherit from this."""
    pass
class UUIDPrimaryKeyMixin:
    """UUID primary key generated in the application."""
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
class TimestampMixin:
    """Created/updated timestamps managed by the database and ORM."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
