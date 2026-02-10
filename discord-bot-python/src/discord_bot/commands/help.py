"""Help slash command."""

import discord
from discord import app_commands


@app_commands.command(name="help", description="Show available commands and usage")
async def help_command(interaction: discord.Interaction) -> None:
    """Show help information."""
    help_text = """**🎖️ Foxhole Quartermaster Bot**

**Slash Commands:**
• `/stats` — Regiment dashboard overview
• `/inventory [search]` — Search items (supports slang: bmat, mammon, 12.7)
• `/stockpiles [hex]` — List stockpiles with freshness
• `/production [status]` — View production orders
• `/operations [status]` — View operations
• `/help` — Show this help

**Natural Language:**
Mention me (@Quartermaster) or DM me with questions like:
• "How many bmats do we have?"
• "Where are the mammons stored?"
• "What do we need for Operation Thunder?"
• "Show me pending production orders"

**Common Slang:**
• Resources: bmat, rmat, comp, ss (shirts)
• Ammo: 12.7, 40mm, 68mm, 75mm
• Tanks: LT, BT, MPT, SH
• Weapons: AT, ATR, RPG, HMG, SMG

**Web Dashboard:**
https://foxhole-quartermaster.com"""

    await interaction.response.send_message(help_text, ephemeral=True)
