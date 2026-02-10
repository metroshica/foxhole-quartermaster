"""Stockpile and inventory models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .item import Inventory
    from .operation import Operation
    from .production import ProductionOrder, ProductionOrderTargetStockpile


class StockpileType(enum.Enum):
    """Types of stockpile locations."""

    STORAGE_DEPOT = "STORAGE_DEPOT"
    SEAPORT = "SEAPORT"


class Stockpile(Base):
    """A specific stockpile location (Seaport or Storage Depot)."""

    __tablename__ = "Stockpile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    regimentId: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[StockpileType] = mapped_column(
        Enum(StockpileType, name="StockpileType", create_type=False),
    )
    hex: Mapped[str] = mapped_column(String)
    locationName: Mapped[str] = mapped_column(String)
    code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lastRefreshedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    inventory: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="stockpile")
    scans: Mapped[list["StockpileScan"]] = relationship("StockpileScan", back_populates="stockpile")
    items: Mapped[list["StockpileItem"]] = relationship("StockpileItem", back_populates="stockpile", cascade="all, delete-orphan")
    destinationOperations: Mapped[list["Operation"]] = relationship("Operation", back_populates="destinationStockpile")
    targetedByOrders: Mapped[list["ProductionOrderTargetStockpile"]] = relationship("ProductionOrderTargetStockpile", back_populates="stockpile")
    deliveredOrders: Mapped[list["ProductionOrder"]] = relationship("ProductionOrder", back_populates="deliveryStockpile", foreign_keys="[ProductionOrder.deliveryStockpileId]")
    standingOrder: Mapped[Optional["ProductionOrder"]] = relationship("ProductionOrder", back_populates="linkedStockpile", foreign_keys="[ProductionOrder.linkedStockpileId]", uselist=False)
    refreshes: Mapped[list["StockpileRefresh"]] = relationship("StockpileRefresh", back_populates="stockpile")

    __table_args__ = (
        Index("Stockpile_regimentId_idx", "regimentId"),
        Index("Stockpile_hex_idx", "hex"),
        Index("Stockpile_regimentId_name_key", "regimentId", "name", unique=True),
    )


class StockpileItem(Base):
    """Direct item storage from scanner results."""

    __tablename__ = "StockpileItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    stockpileId: Mapped[str] = mapped_column(String, ForeignKey("Stockpile.id", ondelete="CASCADE"))
    itemCode: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer)
    crated: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stockpile: Mapped["Stockpile"] = relationship("Stockpile", back_populates="items")

    __table_args__ = (
        Index("StockpileItem_stockpileId_idx", "stockpileId"),
        Index("StockpileItem_itemCode_idx", "itemCode"),
        Index("StockpileItem_stockpileId_itemCode_crated_key", "stockpileId", "itemCode", "crated", unique=True),
    )


class StockpileScan(Base):
    """Record of each OCR scan performed on a stockpile."""

    __tablename__ = "StockpileScan"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    stockpileId: Mapped[str] = mapped_column(String, ForeignKey("Stockpile.id", ondelete="CASCADE"))
    scannedById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    screenshotUrl: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ocrConfidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    itemCount: Mapped[int] = mapped_column(Integer, default=0)
    warNumber: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    stockpile: Mapped["Stockpile"] = relationship("Stockpile", back_populates="scans")
    scannedBy: Mapped["User"] = relationship("User", back_populates="scans")
    inventoryUpdates: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="lastScan")
    scanItems: Mapped[list["StockpileScanItem"]] = relationship("StockpileScanItem", back_populates="scan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("StockpileScan_stockpileId_idx", "stockpileId"),
        Index("StockpileScan_scannedById_idx", "scannedById"),
        Index("StockpileScan_createdAt_idx", "createdAt"),
        Index("StockpileScan_warNumber_idx", "warNumber"),
    )


class StockpileScanItem(Base):
    """Items detected in a specific scan (for audit/history purposes)."""

    __tablename__ = "StockpileScanItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    scanId: Mapped[str] = mapped_column(String, ForeignKey("StockpileScan.id", ondelete="CASCADE"))
    itemCode: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer)
    crated: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    scan: Mapped["StockpileScan"] = relationship("StockpileScan", back_populates="scanItems")

    __table_args__ = (
        Index("StockpileScanItem_scanId_idx", "scanId"),
        Index("StockpileScanItem_itemCode_idx", "itemCode"),
    )


class StockpileRefresh(Base):
    """Record of stockpile refresh actions (for leaderboard points)."""

    __tablename__ = "StockpileRefresh"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    stockpileId: Mapped[str] = mapped_column(String, ForeignKey("Stockpile.id", ondelete="CASCADE"))
    refreshedById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    warNumber: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    stockpile: Mapped["Stockpile"] = relationship("Stockpile", back_populates="refreshes")
    refreshedBy: Mapped["User"] = relationship("User", back_populates="stockpileRefreshes")

    __table_args__ = (
        Index("StockpileRefresh_stockpileId_idx", "stockpileId"),
        Index("StockpileRefresh_refreshedById_idx", "refreshedById"),
        Index("StockpileRefresh_warNumber_idx", "warNumber"),
        Index("StockpileRefresh_createdAt_idx", "createdAt"),
    )
