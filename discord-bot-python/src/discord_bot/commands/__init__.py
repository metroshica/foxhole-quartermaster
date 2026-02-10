"""Discord slash commands."""

from discord import app_commands

from .stats import stats_command
from .inventory import inventory_command
from .stockpiles import stockpiles_command
from .production import production_command
from .operations import operations_command
from .help import help_command


def setup_commands(tree: app_commands.CommandTree) -> None:
    """Register all slash commands.

    Args:
        tree: Command tree to register commands to
    """
    tree.add_command(stats_command)
    tree.add_command(inventory_command)
    tree.add_command(stockpiles_command)
    tree.add_command(production_command)
    tree.add_command(operations_command)
    tree.add_command(help_command)
