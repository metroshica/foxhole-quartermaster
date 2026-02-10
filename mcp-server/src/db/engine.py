"""Database engine configuration."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

from ..config import settings


def create_engine() -> AsyncEngine:
    """Create the async SQLAlchemy engine."""
    return create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


engine = create_engine()
