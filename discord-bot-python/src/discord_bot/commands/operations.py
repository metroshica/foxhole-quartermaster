"""Operations slash command."""

import discord
from discord import app_commands

from ...mcp.client import mcp_client
from ...utils.logger import logger


@app_commands.command(name="operations", description="View operations")
@app_commands.describe(
    status="Filter by status",
)
@app_commands.choices(
    status=[
        app_commands.Choice(name="Planning", value="PLANNING"),
        app_commands.Choice(name="Active", value="ACTIVE"),
        app_commands.Choice(name="Completed", value="COMPLETED"),
        app_commands.Choice(name="Cancelled", value="CANCELLED"),
    ]
)
async def operations_command(
    interaction: discord.Interaction,
    status: app_commands.Choice[str] | None = None,
) -> None:
    """List operations."""
    await interaction.response.defer(ephemeral=True)

    if not interaction.guild:
        await interaction.followup.send("This command can only be used in a server.")
        return

    regiment_id = str(interaction.guild.id)

    try:
        args = {"regimentId": regiment_id, "limit": 10}
        if status:
            args["status"] = status.value

        result = await mcp_client.call_tool("list_operations", args)

        # Parse the result
        import json
        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            data = json.loads(content[0]["text"])
            operations = data.get("operations", [])

            if not operations:
                status_text = f" ({status.name})" if status else ""
                await interaction.followup.send(f"No operations found{status_text}.")
                return

            # Status emoji mapping
            status_emoji = {
                "PLANNING": "📝",
                "ACTIVE": "⚔️",
                "COMPLETED": "✅",
                "CANCELLED": "❌",
            }

            # Build response
            status_text = f" ({status.name})" if status else ""
            lines = [f"**🎯 Operations{status_text}** ({len(operations)})\n"]

            for op in operations[:10]:
                emoji = status_emoji.get(op.get("status", ""), "❓")
                name = op.get("name", "Unknown")
                op_status = op.get("status", "UNKNOWN")
                location = op.get("location", "TBD")
                scheduled = op.get("scheduledForDisplay")
                requirements = op.get("requirementCount", 0)

                lines.append(f"{emoji} **{name}**")
                schedule_text = f" • {scheduled}" if scheduled else ""
                lines.append(f"   {op_status} • {location}{schedule_text}")
                if requirements > 0:
                    lines.append(f"   {requirements} item requirement{'s' if requirements != 1 else ''}")

            if len(operations) > 10:
                lines.append(f"\n_{len(operations) - 10} more operations not shown_")

            await interaction.followup.send("\n".join(lines))
        else:
            await interaction.followup.send("Failed to list operations. Please try again.")

    except Exception as e:
        logger.error("commands", f"Error in /operations: {e}")
        await interaction.followup.send("An error occurred while listing operations.")
