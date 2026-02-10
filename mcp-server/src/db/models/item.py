"""Item definition and inventory models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .regiment import Regiment
    from .stockpile import Stockpile, StockpileScan


class ItemCategory(enum.Enum):
    """Categories for items."""

    SMALL_ARMS = "SMALL_ARMS"
    HEAVY_ARMS = "HEAVY_ARMS"
    AMMUNITION = "AMMUNITION"
    UTILITY = "UTILITY"
    MEDICAL = "MEDICAL"
    RESOURCES = "RESOURCES"
    UNIFORMS = "UNIFORMS"
    VEHICLES = "VEHICLES"
    STRUCTURES = "STRUCTURES"
    SUPPLIES = "SUPPLIES"


class Item(Base):
    """Item definitions - can be global (regimentId null) or regiment-specific."""

    __tablename__ = "Item"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    regimentId: Mapped[Optional[str]] = mapped_column(String, ForeignKey("Regiment.discordId", ondelete="CASCADE"), nullable=True)
    internalName: Mapped[str] = mapped_column(String)
    displayName: Mapped[str] = mapped_column(String)
    category: Mapped[ItemCategory] = mapped_column(
        Enum(ItemCategory, name="ItemCategory", create_type=False),
    )
    iconUrl: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    regiment: Mapped[Optional["Regiment"]] = relationship("Regiment", back_populates="items")
    inventory: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="item")

    __table_args__ = (
        Index("Item_regimentId_idx", "regimentId"),
        Index("Item_category_idx", "category"),
        Index("Item_internalName_idx", "internalName"),
        Index("Item_regimentId_internalName_key", "regimentId", "internalName", unique=True),
    )


class Inventory(Base):
    """Current inventory at a stockpile for a specific item."""

    __tablename__ = "Inventory"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    stockpileId: Mapped[str] = mapped_column(String, ForeignKey("Stockpile.id", ondelete="CASCADE"))
    itemId: Mapped[str] = mapped_column(String, ForeignKey("Item.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer)
    cratedQuantity: Mapped[int] = mapped_column(Integer, default=0)
    lastScanId: Mapped[Optional[str]] = mapped_column(String, ForeignKey("StockpileScan.id"), nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stockpile: Mapped["Stockpile"] = relationship("Stockpile", back_populates="inventory")
    item: Mapped["Item"] = relationship("Item", back_populates="inventory")
    lastScan: Mapped[Optional["StockpileScan"]] = relationship("StockpileScan", back_populates="inventoryUpdates")

    __table_args__ = (
        Index("Inventory_stockpileId_idx", "stockpileId"),
        Index("Inventory_itemId_idx", "itemId"),
        Index("Inventory_stockpileId_itemId_key", "stockpileId", "itemId", unique=True),
    )
