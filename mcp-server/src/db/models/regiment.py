"""Regiment and membership models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .item import Item
    from .operation import Operation
    from .production import ProductionOrder


class PermissionLevel(enum.Enum):
    """Permission levels for regiment members."""

    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class Regiment(Base):
    """Discord servers (guilds) representing regiments."""

    __tablename__ = "Regiment"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    discordId: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Role mappings stored as arrays of Discord Role IDs
    adminRoles: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    editorRoles: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    viewerRoles: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    members: Mapped[list["RegimentMember"]] = relationship("RegimentMember", back_populates="regiment")
    items: Mapped[list["Item"]] = relationship("Item", back_populates="regiment")
    operations: Mapped[list["Operation"]] = relationship("Operation", back_populates="regiment")
    productionOrders: Mapped[list["ProductionOrder"]] = relationship("ProductionOrder", back_populates="regiment")

    __table_args__ = (Index("Regiment_discordId_idx", "discordId"),)


class RegimentMember(Base):
    """User-regiment membership with cached permission level."""

    __tablename__ = "RegimentMember"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    regimentId: Mapped[str] = mapped_column(String, ForeignKey("Regiment.discordId", ondelete="CASCADE"))
    permissionLevel: Mapped[PermissionLevel] = mapped_column(Enum(PermissionLevel))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="regimentMembers")
    regiment: Mapped["Regiment"] = relationship("Regiment", back_populates="members")

    __table_args__ = (
        Index("RegimentMember_userId_idx", "userId"),
        Index("RegimentMember_regimentId_idx", "regimentId"),
        Index("RegimentMember_userId_regimentId_key", "userId", "regimentId", unique=True),
    )
