"""MCP tools for Foxhole Quartermaster."""

from .stats import register_stats_tools
from .inventory import register_inventory_tools
from .stockpiles import register_stockpile_tools
from .production import register_production_tools
from .operations import register_operation_tools
from .scanner import register_scanner_tools

__all__ = [
    "register_stats_tools",
    "register_inventory_tools",
    "register_stockpile_tools",
    "register_production_tools",
    "register_operation_tools",
    "register_scanner_tools",
]
