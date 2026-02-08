"""User and authentication models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .regiment import RegimentMember
    from .stockpile import StockpileScan, StockpileRefresh
    from .operation import Operation
    from .production import ProductionOrder, ProductionContribution


class User(Base):
    """Discord-authenticated users."""

    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    discordId: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    emailVerified: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    selectedRegimentId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tutorialCompleted: Mapped[bool] = mapped_column(Boolean, default=False)
    tutorialCompletedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    regimentMembers: Mapped[list["RegimentMember"]] = relationship("RegimentMember", back_populates="user")
    scans: Mapped[list["StockpileScan"]] = relationship("StockpileScan", back_populates="scannedBy")
    operations: Mapped[list["Operation"]] = relationship("Operation", back_populates="createdBy")
    productionOrders: Mapped[list["ProductionOrder"]] = relationship("ProductionOrder", back_populates="createdBy")
    productionContributions: Mapped[list["ProductionContribution"]] = relationship("ProductionContribution", back_populates="user")
    stockpileRefreshes: Mapped[list["StockpileRefresh"]] = relationship("StockpileRefresh", back_populates="refreshedBy")

    __table_args__ = (
        Index("User_discordId_idx", "discordId"),
        Index("User_selectedRegimentId_idx", "selectedRegimentId"),
    )


class Account(Base):
    """OAuth account linkage (NextAuth.js)."""

    __tablename__ = "Account"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String)
    provider: Mapped[str] = mapped_column(String)
    providerAccountId: Mapped[str] = mapped_column(String)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    id_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    session_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="accounts")

    __table_args__ = (
        Index("Account_userId_idx", "userId"),
        Index("Account_provider_providerAccountId_key", "provider", "providerAccountId", unique=True),
    )


class Session(Base):
    """User sessions (NextAuth.js)."""

    __tablename__ = "Session"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    sessionToken: Mapped[str] = mapped_column(String, unique=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    expires: Mapped[datetime] = mapped_column(DateTime)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    __table_args__ = (Index("Session_userId_idx", "userId"),)


class VerificationToken(Base):
    """Email verification tokens (NextAuth.js)."""

    __tablename__ = "VerificationToken"

    identifier: Mapped[str] = mapped_column(String, primary_key=True)
    token: Mapped[str] = mapped_column(String, unique=True, primary_key=True)
    expires: Mapped[datetime] = mapped_column(DateTime)
