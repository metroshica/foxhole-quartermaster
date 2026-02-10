"""Inventory slash command."""

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger


@app_commands.command(name="inventory", description="Search regiment inventory")
@app_commands.describe(search="Search term (item name, code, or slang like 'bmat', 'mammon', '12.7')")
async def inventory_command(interaction: discord.Interaction, search: str | None = None) -> None:
    """Search regiment inventory."""
    await interaction.response.defer(ephemeral=True)

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        args = {"regimentId": regiment_id, "limit": 10}
        if search:
            args["query"] = search

        result = await mcp_client.call_tool("search_inventory", args)

        # Parse the result
        import json
        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])
            items = data.get("items", [])

            if not items:
                if search:
                    await interaction.followup.send(f"No items found matching **{search}**")
                else:
                    await interaction.followup.send("No items in inventory.")
                return

            # Build response
            lines = [f"**🔍 Inventory Search{f': {search}' if search else ''}**\n"]

            for item in items[:10]:
                name = item.get("displayName", item.get("itemCode", "Unknown"))
                total = item.get("totalQuantity", 0)
                stockpiles = item.get("stockpileCount", 0)
                tag = f" `{item.get('matchedTag')}`" if item.get("matchedTag") else ""

                lines.append(f"**{name}**{tag}: {total:,} ({stockpiles} stockpile{'s' if stockpiles != 1 else ''})")

            if len(items) < data.get("totalUniqueItems", 0):
                lines.append(f"\n_{data.get('totalUniqueItems', 0)} total unique items_")

            await interaction.followup.send("\n".join(lines))
        else:
            await interaction.followup.send("Failed to search inventory. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /inventory: {e}")
        await interaction.followup.send("An error occurred while searching inventory.")
