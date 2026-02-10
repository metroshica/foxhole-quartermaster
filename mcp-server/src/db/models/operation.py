"""Operation planning models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .regiment import Regiment
    from .stockpile import Stockpile


class OperationStatus(enum.Enum):
    """Status of an operation."""

    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Operation(Base):
    """A planned military operation with equipment requirements."""

    __tablename__ = "Operation"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    regimentId: Mapped[str] = mapped_column(String, ForeignKey("Regiment.discordId", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[OperationStatus] = mapped_column(
        Enum(OperationStatus, name="OperationStatus", create_type=False),
        default=OperationStatus.PLANNING,
    )
    scheduledFor: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scheduledEndAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    destinationStockpileId: Mapped[Optional[str]] = mapped_column(String, ForeignKey("Stockpile.id"), nullable=True)
    createdById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # War scoping and archival
    warNumber: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    archivedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    regiment: Mapped["Regiment"] = relationship("Regiment", back_populates="operations")
    createdBy: Mapped["User"] = relationship("User", back_populates="operations")
    destinationStockpile: Mapped[Optional["Stockpile"]] = relationship("Stockpile", back_populates="destinationOperations")
    requirements: Mapped[list["OperationRequirement"]] = relationship("OperationRequirement", back_populates="operation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("Operation_regimentId_idx", "regimentId"),
        Index("Operation_status_idx", "status"),
        Index("Operation_scheduledFor_idx", "scheduledFor"),
        Index("Operation_createdById_idx", "createdById"),
        Index("Operation_destinationStockpileId_idx", "destinationStockpileId"),
        Index("Operation_warNumber_idx", "warNumber"),
        Index("Operation_archivedAt_idx", "archivedAt"),
    )


class OperationRequirement(Base):
    """Equipment requirement for an operation."""

    __tablename__ = "OperationRequirement"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    operationId: Mapped[str] = mapped_column(String, ForeignKey("Operation.id", ondelete="CASCADE"))
    itemCode: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    operation: Mapped["Operation"] = relationship("Operation", back_populates="requirements")

    __table_args__ = (
        Index("OperationRequirement_operationId_idx", "operationId"),
        Index("OperationRequirement_itemCode_idx", "itemCode"),
        Index("OperationRequirement_operationId_itemCode_key", "operationId", "itemCode", unique=True),
    )
