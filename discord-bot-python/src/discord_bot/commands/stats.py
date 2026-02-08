"""Stats slash command."""

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger


@app_commands.command(name="stats", description="Get regiment overview statistics")
async def stats_command(interaction: discord.Interaction) -> None:
    """Show regiment dashboard stats."""
    await interaction.response.defer()

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        result = await mcp_client.call_tool("get_dashboard_stats", {"regimentId": regiment_id})

        # Parse the result
        import json
        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])

            response = f"""**📊 Regiment Dashboard**

**Stockpiles:** {data.get('stockpileCount', 0)}
**Total Items:** {data.get('totalItems', 0):,}
**Active Operations:** {data.get('activeOperationCount', 0)}
**Pending Production:** {data.get('pendingProductionCount', 0)}

**Last Update:** {data.get('lastUpdated', 'Never')}
**Location:** {data.get('lastUpdatedStockpile', 'N/A')}
**Scans (24h):** {data.get('scansLast24Hours', 0)}"""

            await interaction.followup.send(response)
        else:
            await interaction.followup.send("Failed to fetch stats. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /stats: {e}")
        await interaction.followup.send("An error occurred while fetching stats.")
