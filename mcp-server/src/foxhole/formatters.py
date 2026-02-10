"""Formatting utilities for display."""

from datetime import datetime


def format_relative_time(date: datetime) -> str:
    """Format a date as relative time (e.g., '5m ago', '2h ago')."""
    now = datetime.utcnow()
    diff = now - date
    diff_mins = int(diff.total_seconds() / 60)

    if diff_mins < 1:
        return "Just now"
    if diff_mins < 60:
        return f"{diff_mins}m ago"
    diff_hours = diff_mins // 60
    if diff_hours < 24:
        return f"{diff_hours}h ago"
    diff_days = diff_hours // 24
    if diff_days < 7:
        return f"{diff_days}d ago"
    return date.strftime("%b %d, %Y")


def format_quantity(quantity: int) -> str:
    """Format a quantity with commas for readability."""
    return f"{quantity:,}"


def format_date(date: datetime) -> str:
    """Format a date for display."""
    return date.strftime("%b %d, %I:%M %p")


def format_duration(ms: int) -> str:
    """Format a duration in milliseconds to human readable string."""
    seconds = ms // 1000
    minutes = seconds // 60
    hours = minutes // 60
    days = hours // 24

    if days > 0:
        return f"{days}d {hours % 24}h"
    if hours > 0:
        return f"{hours}h {minutes % 60}m"
    if minutes > 0:
        return f"{minutes}m"
    return f"{seconds}s"


def get_priority_label(priority: int) -> str:
    """Get priority label from priority number."""
    labels = {
        0: "Low",
        1: "Medium",
        2: "High",
        3: "Critical",
    }
    return labels.get(priority, "Unknown")


def format_stockpile_type(stockpile_type: str) -> str:
    """Format stockpile type for display."""
    type_labels = {
        "SEAPORT": "Seaport",
        "STORAGE_DEPOT": "Storage Depot",
        "DEPOT": "Depot",
        "BASE": "Base",
    }
    return type_labels.get(stockpile_type, stockpile_type)
