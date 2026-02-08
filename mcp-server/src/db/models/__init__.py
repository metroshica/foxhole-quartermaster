"""SQLAlchemy models for Foxhole Quartermaster.

These models mirror the Prisma schema used by the web application.
"""

from .base import Base
from .user import User, Account, Session, VerificationToken
from .regiment import Regiment, RegimentMember, PermissionLevel
from .stockpile import (
    Stockpile,
    StockpileType,
    StockpileItem,
    StockpileScan,
    StockpileScanItem,
    StockpileRefresh,
)
from .item import Item, Inventory, ItemCategory
from .operation import Operation, OperationStatus, OperationRequirement
from .production import (
    ProductionOrder,
    ProductionOrderStatus,
    ProductionOrderItem,
    ProductionContribution,
    ProductionOrderTargetStockpile,
)

__all__ = [
    # Base
    "Base",
    # User models
    "User",
    "Account",
    "Session",
    "VerificationToken",
    # Regiment models
    "Regiment",
    "RegimentMember",
    "PermissionLevel",
    # Stockpile models
    "Stockpile",
    "StockpileType",
    "StockpileItem",
    "StockpileScan",
    "StockpileScanItem",
    "StockpileRefresh",
    # Item models
    "Item",
    "Inventory",
    "ItemCategory",
    # Operation models
    "Operation",
    "OperationStatus",
    "OperationRequirement",
    # Production models
    "ProductionOrder",
    "ProductionOrderStatus",
    "ProductionOrderItem",
    "ProductionContribution",
    "ProductionOrderTargetStockpile",
]
