"""Logging configuration for the Discord bot."""

import logging
import sys
import time
import uuid
from typing import Any, Optional

from ..config import settings


class BotLogger:
    """Custom logger with request correlation and timing."""

    def __init__(self) -> None:
        self._logger = logging.getLogger("discord-bot")
        self._request_id: Optional[str] = None
        self._timers: dict[str, float] = {}
        self._setup()

    def _setup(self) -> None:
        """Set up logging configuration."""
        level = getattr(logging, settings.log_level.upper(), logging.INFO)
        self._logger.setLevel(level)
        self._logger.handlers.clear()

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)

        if settings.debug:
            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(message)s",
                datefmt="%H:%M:%S.%f",
            )
        else:
            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(message)s",
                datefmt="%H:%M:%S",
            )

        handler.setFormatter(formatter)
        self._logger.addHandler(handler)

    def generate_request_id(self) -> str:
        """Generate a unique request ID."""
        return f"req-{uuid.uuid4().hex[:4]}"

    def set_request_id(self, request_id: Optional[str]) -> None:
        """Set the current request ID for correlation."""
        self._request_id = request_id

    def _format_message(self, category: str, message: str) -> str:
        """Format a log message with request ID and category."""
        prefix = f"[{self._request_id}] " if self._request_id else ""
        return f"{prefix}[{category}] {message}"

    def _format_data(self, data: Optional[dict[str, Any]] = None) -> str:
        """Format additional data for logging."""
        if not data:
            return ""
        items = [f"{k}={v}" for k, v in data.items()]
        return " | " + ", ".join(items)

    def debug(self, category: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log a debug message."""
        self._logger.debug(self._format_message(category, message) + self._format_data(data))

    def info(self, category: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log an info message."""
        self._logger.info(self._format_message(category, message) + self._format_data(data))

    def warn(self, category: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log a warning message."""
        self._logger.warning(self._format_message(category, message) + self._format_data(data))

    def error(self, category: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log an error message."""
        self._logger.error(self._format_message(category, message) + self._format_data(data))

    def trace(self, category: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log a trace message (debug level)."""
        if settings.debug:
            self._logger.debug(self._format_message(category, f"[TRACE] {message}") + self._format_data(data))

    def time(self, label: str) -> None:
        """Start a timer."""
        self._timers[label] = time.perf_counter()

    def time_end(self, label: str) -> int:
        """End a timer and return elapsed milliseconds."""
        start = self._timers.pop(label, None)
        if start is None:
            return 0
        return int((time.perf_counter() - start) * 1000)

    def separator(self) -> None:
        """Print a separator line."""
        if settings.debug:
            print("-" * 60)


def setup_logging() -> BotLogger:
    """Set up and return the logger."""
    return BotLogger()


logger = setup_logging()
