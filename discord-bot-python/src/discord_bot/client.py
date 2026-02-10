"""Discord client setup and bot lifecycle."""

import discord
from discord import app_commands

from ..config import settings
from ..utils.logger import logger
from .commands import setup_commands
from .message_handler import handle_message


class QuartermasterBot(discord.Client):
    """Custom Discord client for Foxhole Quartermaster."""

    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True

        super().__init__(intents=intents)

        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self) -> None:
        """Called when the client is done preparing."""
        # Set up slash commands
        setup_commands(self.tree)

        # Sync commands globally
        logger.debug("discord", "Syncing slash commands...")
        await self.tree.sync()
        logger.info("discord", f"Synced {len(self.tree.get_commands())} slash commands")

    async def on_ready(self) -> None:
        """Called when the client is ready."""
        assert self.user is not None
        logger.info(
            "discord",
            f"Logged in as {self.user} ({len(self.guilds)} guild{'s' if len(self.guilds) != 1 else ''})",
        )

        # Set bot presence
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="Foxhole logistics",
            ),
            status=discord.Status.online,
        )

    async def on_message(self, message: discord.Message) -> None:
        """Called when a message is received."""
        await handle_message(self, message)

    # Testing: only respond to authorized user for slash commands
    AUTHORIZED_USER_ID = 112967182752768000

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Gate slash commands to authorized user only during testing."""
        if interaction.user.id != self.AUTHORIZED_USER_ID:
            await interaction.response.send_message("Bot is in testing mode.", ephemeral=True)
            return False
        return True


def create_discord_client() -> QuartermasterBot:
    """Create and configure the Discord client.

    Returns:
        Configured QuartermasterBot instance
    """
    return QuartermasterBot()


async def start_bot() -> QuartermasterBot:
    """Start the Discord bot.

    Returns:
        Running QuartermasterBot instance
    """
    client = create_discord_client()
    await client.start(settings.discord_bot_token)
    return client
