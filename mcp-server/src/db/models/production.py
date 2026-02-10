"""Production order models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .regiment import Regiment
    from .stockpile import Stockpile


class ProductionOrderStatus(enum.Enum):
    """Status of a production order."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FULFILLED = "FULFILLED"


class ProductionOrder(Base):
    """A production order for items that need to be manufactured."""

    __tablename__ = "ProductionOrder"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    shortId: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    regimentId: Mapped[str] = mapped_column(String, ForeignKey("Regiment.discordId", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[ProductionOrderStatus] = mapped_column(
        Enum(ProductionOrderStatus, name="ProductionOrderStatus", create_type=False),
        default=ProductionOrderStatus.PENDING,
    )
    priority: Mapped[int] = mapped_column(Integer, default=0)
    createdById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # MPF (Mass Production Factory) specific fields
    isMpf: Mapped[bool] = mapped_column(Boolean, default=False)
    mpfSubmittedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    mpfReadyAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Delivery tracking
    deliveredAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deliveryStockpileId: Mapped[Optional[str]] = mapped_column(String, ForeignKey("Stockpile.id"), nullable=True)

    # War scoping and archival
    warNumber: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    archivedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    isStandingOrder: Mapped[bool] = mapped_column(Boolean, default=False)
    linkedStockpileId: Mapped[Optional[str]] = mapped_column(String, ForeignKey("Stockpile.id"), unique=True, nullable=True)

    # Relationships
    regiment: Mapped["Regiment"] = relationship("Regiment", back_populates="productionOrders")
    createdBy: Mapped["User"] = relationship("User", back_populates="productionOrders")
    deliveryStockpile: Mapped[Optional["Stockpile"]] = relationship("Stockpile", back_populates="deliveredOrders", foreign_keys=[deliveryStockpileId])
    linkedStockpile: Mapped[Optional["Stockpile"]] = relationship("Stockpile", back_populates="standingOrder", foreign_keys=[linkedStockpileId])
    items: Mapped[list["ProductionOrderItem"]] = relationship("ProductionOrderItem", back_populates="order", cascade="all, delete-orphan")
    contributions: Mapped[list["ProductionContribution"]] = relationship("ProductionContribution", back_populates="order")
    targetStockpiles: Mapped[list["ProductionOrderTargetStockpile"]] = relationship("ProductionOrderTargetStockpile", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ProductionOrder_regimentId_idx", "regimentId"),
        Index("ProductionOrder_status_idx", "status"),
        Index("ProductionOrder_createdById_idx", "createdById"),
        Index("ProductionOrder_deliveryStockpileId_idx", "deliveryStockpileId"),
        Index("ProductionOrder_warNumber_idx", "warNumber"),
        Index("ProductionOrder_archivedAt_idx", "archivedAt"),
        Index("ProductionOrder_linkedStockpileId_idx", "linkedStockpileId"),
    )


class ProductionOrderItem(Base):
    """Items within a production order with progress tracking."""

    __tablename__ = "ProductionOrderItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    orderId: Mapped[str] = mapped_column(String, ForeignKey("ProductionOrder.id", ondelete="CASCADE"))
    itemCode: Mapped[str] = mapped_column(String)
    quantityRequired: Mapped[int] = mapped_column(Integer)
    quantityProduced: Mapped[int] = mapped_column(Integer, default=0)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order: Mapped["ProductionOrder"] = relationship("ProductionOrder", back_populates="items")

    __table_args__ = (
        Index("ProductionOrderItem_orderId_idx", "orderId"),
        Index("ProductionOrderItem_itemCode_idx", "itemCode"),
        Index("ProductionOrderItem_orderId_itemCode_key", "orderId", "itemCode", unique=True),
    )


class ProductionContribution(Base):
    """Tracks individual production contributions for leaderboard scoring."""

    __tablename__ = "ProductionContribution"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    orderId: Mapped[str] = mapped_column(String, ForeignKey("ProductionOrder.id", ondelete="CASCADE"))
    itemCode: Mapped[str] = mapped_column(String)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    warNumber: Mapped[int] = mapped_column(Integer)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    order: Mapped["ProductionOrder"] = relationship("ProductionOrder", back_populates="contributions")
    user: Mapped["User"] = relationship("User", back_populates="productionContributions")

    __table_args__ = (
        Index("ProductionContribution_orderId_idx", "orderId"),
        Index("ProductionContribution_userId_idx", "userId"),
        Index("ProductionContribution_warNumber_idx", "warNumber"),
        Index("ProductionContribution_createdAt_idx", "createdAt"),
    )


class ProductionOrderTargetStockpile(Base):
    """Junction table for production order target stockpiles (many-to-many)."""

    __tablename__ = "ProductionOrderTargetStockpile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    orderId: Mapped[str] = mapped_column(String, ForeignKey("ProductionOrder.id", ondelete="CASCADE"))
    stockpileId: Mapped[str] = mapped_column(String, ForeignKey("Stockpile.id", ondelete="CASCADE"))

    # Relationships
    order: Mapped["ProductionOrder"] = relationship("ProductionOrder", back_populates="targetStockpiles")
    stockpile: Mapped["Stockpile"] = relationship("Stockpile", back_populates="targetedByOrders")

    __table_args__ = (
        Index("ProductionOrderTargetStockpile_orderId_idx", "orderId"),
        Index("ProductionOrderTargetStockpile_stockpileId_idx", "stockpileId"),
        Index("ProductionOrderTargetStockpile_orderId_stockpileId_key", "orderId", "stockpileId", unique=True),
    )
