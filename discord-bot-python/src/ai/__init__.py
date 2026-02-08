"""AI module for Gemini integration."""

from .agent import process_with_ai
from .prompts import build_system_prompt

__all__ = ["process_with_ai", "build_system_prompt"]
