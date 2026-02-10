"""RBAC (Role-Based Access Control) models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .regiment import Regiment, RegimentMember


class Role(Base):
    """Custom roles within a regiment with assignable permissions."""

    __tablename__ = "Role"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    regimentId: Mapped[str] = mapped_column(String, ForeignKey("Regiment.discordId", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    isDefault: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    regiment: Mapped["Regiment"] = relationship("Regiment", back_populates="roles")
    permissions: Mapped[list["RolePermission"]] = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    discordMappings: Mapped[list["RoleDiscordMapping"]] = relationship("RoleDiscordMapping", back_populates="role", cascade="all, delete-orphan")
    memberRoles: Mapped[list["RegimentMemberRole"]] = relationship("RegimentMemberRole", back_populates="role", cascade="all, delete-orphan")

    __table_args__ = (
        Index("Role_regimentId_idx", "regimentId"),
        Index("Role_regimentId_name_key", "regimentId", "name", unique=True),
    )


class RolePermission(Base):
    """Individual permission assigned to a role."""

    __tablename__ = "RolePermission"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    roleId: Mapped[str] = mapped_column(String, ForeignKey("Role.id", ondelete="CASCADE"))
    permission: Mapped[str] = mapped_column(String)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="permissions")

    __table_args__ = (
        Index("RolePermission_roleId_idx", "roleId"),
        Index("RolePermission_roleId_permission_key", "roleId", "permission", unique=True),
    )


class RoleDiscordMapping(Base):
    """Maps a Discord role ID to an application role."""

    __tablename__ = "RoleDiscordMapping"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    roleId: Mapped[str] = mapped_column(String, ForeignKey("Role.id", ondelete="CASCADE"))
    discordRoleId: Mapped[str] = mapped_column(String)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="discordMappings")

    __table_args__ = (
        Index("RoleDiscordMapping_discordRoleId_idx", "discordRoleId"),
        Index("RoleDiscordMapping_roleId_discordRoleId_key", "roleId", "discordRoleId", unique=True),
    )


class RegimentMemberRole(Base):
    """Junction table: assigns a role to a regiment member."""

    __tablename__ = "RegimentMemberRole"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    memberId: Mapped[str] = mapped_column(String, ForeignKey("RegimentMember.id", ondelete="CASCADE"))
    roleId: Mapped[str] = mapped_column(String, ForeignKey("Role.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(String, default="discord")

    # Relationships
    member: Mapped["RegimentMember"] = relationship("RegimentMember", back_populates="roles")
    role: Mapped["Role"] = relationship("Role", back_populates="memberRoles")

    __table_args__ = (
        Index("RegimentMemberRole_memberId_idx", "memberId"),
        Index("RegimentMemberRole_roleId_idx", "roleId"),
        Index("RegimentMemberRole_memberId_roleId_key", "memberId", "roleId", unique=True),
    )
