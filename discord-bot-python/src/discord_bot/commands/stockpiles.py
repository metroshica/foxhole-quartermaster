"""Stockpiles slash command."""

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger


@app_commands.command(name="stockpiles", description="List stockpiles with freshness status")
@app_commands.describe(hex="Filter by hex/region name")
async def stockpiles_command(interaction: discord.Interaction, hex: str | None = None) -> None:
    """List regiment stockpiles."""
    await interaction.response.defer(ephemeral=True)

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        args = {"regimentId": regiment_id}
        if hex:
            args["hex"] = hex

        result = await mcp_client.call_tool("list_stockpiles", args)

        # Parse the result
        import json
        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])
            stockpiles = data.get("stockpiles", [])

            if not stockpiles:
                if hex:
                    await interaction.followup.send(f"No stockpiles found in **{hex}**")
                else:
                    await interaction.followup.send("No stockpiles found.")
                return

            # Status emoji mapping
            status_emoji = {
                "fresh": "🟢",
                "aging": "🟡",
                "expiring_soon": "🟠",
                "expired": "🔴",
                "unknown": "⚪",
            }

            # Build response
            lines = [f"**📦 Stockpiles{f' in {hex}' if hex else ''}** ({len(stockpiles)})\n"]

            for sp in stockpiles[:15]:
                emoji = status_emoji.get(sp.get("freshnessStatus", "unknown"), "⚪")
                name = sp.get("name", "Unknown")
                location = sp.get("location", "Unknown")
                last_scan = sp.get("lastScanRelative", "Never")
                hours = sp.get("hoursUntilExpiry")
                expiry = f" ({hours:.1f}h left)" if hours is not None else ""

                lines.append(f"{emoji} **{name}** — {location}")
                lines.append(f"   Scan: {last_scan}{expiry}")

            if len(stockpiles) > 15:
                lines.append(f"\n_{len(stockpiles) - 15} more stockpiles not shown_")

            await interaction.followup.send("\n".join(lines))
        else:
            await interaction.followup.send("Failed to list stockpiles. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /stockpiles: {e}")
        await interaction.followup.send("An error occurred while listing stockpiles.")
