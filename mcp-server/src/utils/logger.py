"""Logging configuration."""

import logging
import sys
from typing import Optional

from ..config import settings


def setup_logging(level: Optional[str] = None) -> logging.Logger:
    """Set up logging configuration.

    Args:
        level: Override log level (default from settings)

    Returns:
        The configured logger
    """
    log_level = level or settings.log_level

    # Create logger
    logger = logging.getLogger("mcp-server")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Clear existing handlers
    logger.handlers.clear()

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Create formatter
    if settings.debug:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


# Create default logger
logger = setup_logging()
