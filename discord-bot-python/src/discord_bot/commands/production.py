"""Production slash command."""

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger


@app_commands.command(name="production", description="View production orders")
@app_commands.describe(
    status="Filter by status",
)
@app_commands.choices(
    status=[
        app_commands.Choice(name="Pending", value="PENDING"),
        app_commands.Choice(name="In Progress", value="IN_PROGRESS"),
        app_commands.Choice(name="Ready for Pickup", value="READY_FOR_PICKUP"),
        app_commands.Choice(name="Completed", value="COMPLETED"),
    ]
)
async def production_command(
    interaction: discord.Interaction,
    status: app_commands.Choice[str] | None = None,
) -> None:
    """List production orders."""
    await interaction.response.defer()

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        args = {"regimentId": regiment_id, "limit": 10}
        if status:
            args["status"] = status.value

        result = await mcp_client.call_tool("list_production_orders", args)

        # Parse the result
        import json
        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])
            orders = data.get("orders", [])

            if not orders:
                status_text = f" ({status.name})" if status else ""
                await interaction.followup.send(f"No production orders found{status_text}.")
                return

            # Priority emoji mapping
            priority_emoji = {
                0: "⬜",  # Low
                1: "🟦",  # Medium
                2: "🟧",  # High
                3: "🟥",  # Critical
            }

            # Build response
            status_text = f" ({status.name})" if status else ""
            lines = [f"**🏭 Production Orders{status_text}** ({len(orders)})\n"]

            for order in orders[:10]:
                emoji = priority_emoji.get(order.get("priority", 0), "⬜")
                name = order.get("name", "Unknown")
                order_status = order.get("status", "UNKNOWN")
                progress = order.get("progressPercent", 0)
                is_mpf = order.get("isMpf", False)
                time_remaining = order.get("timeRemaining")

                mpf_tag = " `MPF`" if is_mpf else ""
                timer = f" ⏱️ {time_remaining}" if time_remaining else ""

                lines.append(f"{emoji} **{name}**{mpf_tag}")
                lines.append(f"   {order_status} • {progress}% complete{timer}")

            if len(orders) > 10:
                lines.append(f"\n_{len(orders) - 10} more orders not shown_")

            await interaction.followup.send("\n".join(lines))
        else:
            await interaction.followup.send("Failed to list production orders. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /production: {e}")
        await interaction.followup.send("An error occurred while listing production orders.")
