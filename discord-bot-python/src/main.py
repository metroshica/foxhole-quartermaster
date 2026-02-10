"""Main entry point for the Discord bot."""

import asyncio
import signal
import sys

from .config import settings
from .utils.logger import logger
from .mcp.client import mcp_client
from .discord_bot.client import create_discord_client


async def main() -> None:
    """Main entry point."""
    logger.info("main", "Starting Foxhole Quartermaster Discord Bot")
    logger.info("main", f"Debug mode: {settings.debug}")

    # Check MCP server connectivity
    logger.debug("main", f"Checking MCP server at {settings.mcp_server_url}")
    if await mcp_client.health_check():
        logger.info("main", "MCP server connection successful")
    else:
        logger.error("main", "MCP server is not reachable. Starting bot anyway...")

    # Create and start Discord client
    client = create_discord_client()

    # Set up signal handlers for graceful shutdown
    loop = asyncio.get_event_loop()

    def signal_handler() -> None:
        logger.info("main", "Received shutdown signal")
        asyncio.create_task(shutdown(client))

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)

    try:
        logger.debug("main", "Starting Discord client")
        await client.start(settings.discord_bot_token)
    except KeyboardInterrupt:
        logger.info("main", "Keyboard interrupt received")
    finally:
        await shutdown(client)


async def shutdown(client) -> None:
    """Graceful shutdown."""
    logger.info("main", "Shutting down...")

    if not client.is_closed():
        await client.close()

    logger.info("main", "Shutdown complete")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error("main", f"Fatal error: {e}")
        sys.exit(1)
