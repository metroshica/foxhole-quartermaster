"""Production slash command."""

import json

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger

BASE_URL = "https://foxhole-quartermaster.com"
UNFULFILLED_STATUSES = {"PENDING", "IN_PROGRESS", "READY_FOR_PICKUP"}


@app_commands.command(name="production", description="View unfulfilled production orders")
async def production_command(
    interaction: discord.Interaction,
) -> None:
    """List unfulfilled production orders."""
    await interaction.response.defer(ephemeral=True)

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        args = {"regimentId": regiment_id, "limit": 20}
        result = await mcp_client.call_tool("list_production_orders", args)

        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])
            orders = data.get("orders", [])

            # Filter to unfulfilled orders only
            orders = [o for o in orders if o.get("status") in UNFULFILLED_STATUSES]

            if not orders:
                await interaction.followup.send("No unfulfilled production orders.")
                return

            # Priority emoji mapping
            priority_emoji = {
                0: "⬜",  # Low
                1: "🟦",  # Medium
                2: "🟧",  # High
                3: "🟥",  # Critical
            }

            lines = [f"**🏭 Production Orders** ({len(orders)})\n"]

            for order in orders[:5]:
                emoji = priority_emoji.get(order.get("priority", 0), "⬜")
                name = order.get("name", "Unknown")
                short_id = order.get("shortId")

                # Location from target stockpiles
                target_stockpiles = order.get("targetStockpiles", [])
                location = target_stockpiles[0]["location"] if target_stockpiles else None

                # Order header with location
                header = f"{emoji} **{name}**"
                if location:
                    header += f" · {location}"
                lines.append(header)

                # Link
                if short_id:
                    lines.append(f"<{BASE_URL}/p/{short_id}>")

                # Items list
                items = order.get("items", [])
                for item in items[:6]:
                    display_name = item.get("displayName", item.get("itemCode", "?"))
                    produced = item.get("quantityProduced", 0)
                    required = item.get("quantityRequired", 0)
                    lines.append(f"  {display_name}: {produced}/{required}")

                if len(items) > 6:
                    lines.append(f"  _+{len(items) - 6} more items_")

                lines.append("")  # blank line between orders

            if len(orders) > 5:
                lines.append(f"_{len(orders) - 5} more orders not shown_")

            await interaction.followup.send("\n".join(lines))
        else:
            await interaction.followup.send("Failed to list production orders. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /production: {e}")
        await interaction.followup.send("An error occurred while listing production orders.")
