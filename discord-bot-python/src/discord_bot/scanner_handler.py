"""Scanner channel handler - watches for stockpile screenshots and processes them."""

import json
import time
from typing import Any

import discord

from ..mcp.client import mcp_client
from ..utils.logger import logger

# Cache: {guild_id: {"channel_id": str | None, "expires_at": float}}
_scanner_channel_cache: dict[str, dict[str, Any]] = {}
_CACHE_TTL = 300  # 5 minutes


def _parse_mcp_result(result: dict[str, Any]) -> dict[str, Any]:
    """Parse the JSON text content from an MCP tool response."""
    if "error" in result:
        return {"error": result["error"]}
    content = result.get("content", [])
    if content and content[0].get("type") == "text":
        return json.loads(content[0]["text"])
    return {"error": "Unexpected MCP response format"}


async def _get_scanner_channel_id(guild_id: str) -> str | None:
    """Get the scanner channel ID for a guild, using cache."""
    now = time.time()
    cached = _scanner_channel_cache.get(guild_id)
    if cached and cached["expires_at"] > now:
        return cached["channel_id"]

    # Fetch from MCP
    result = await mcp_client.call_tool("get_scanner_channel", {"regimentId": guild_id})
    parsed = _parse_mcp_result(result)
    channel_id = parsed.get("scannerChannelId")

    _scanner_channel_cache[guild_id] = {
        "channel_id": channel_id,
        "expires_at": now + _CACHE_TTL,
    }
    return channel_id


async def is_scanner_channel(message: discord.Message) -> bool:
    """Check if a message was sent in the scanner channel for its guild."""
    if not message.guild:
        return False
    channel_id = await _get_scanner_channel_id(str(message.guild.id))
    return channel_id is not None and str(message.channel.id) == channel_id


def _normalize_for_match(s: str) -> str:
    """Normalize string for matching: remove special chars, handle OCR confusion.

    Mirrors the web app's normalizeForMatch() logic.
    """
    import re
    result = s.lower()
    result = re.sub(r"[^a-z0-9]", "", result)
    result = result.replace("o", "0")  # Normalize O to 0 for OCR confusion
    result = result.replace("l", "1")  # Normalize l to 1 for OCR confusion
    return result


def _match_stockpile(detected_name: str | None, stockpiles: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Match a detected stockpile name against known stockpiles.

    Uses the same matching strategy as the web app's quick-upload:
    1. Exact match (case-insensitive)
    2. Normalized match (strip special chars, handle O/0 and l/1 OCR confusion)
    3. Partial/contains match on normalized strings
    """
    if not detected_name or not stockpiles:
        return None

    detected_lower = detected_name.lower().strip()
    detected_normalized = _normalize_for_match(detected_name)

    # Exact match on name (case-insensitive)
    for sp in stockpiles:
        if sp["name"].lower().strip() == detected_lower:
            return sp

    # Normalized match (ignore special chars, handle OCR confusion)
    for sp in stockpiles:
        if _normalize_for_match(sp["name"]) == detected_normalized:
            return sp

    # Partial/contains match on normalized strings
    for sp in stockpiles:
        sp_normalized = _normalize_for_match(sp["name"])
        if sp_normalized in detected_normalized or detected_normalized in sp_normalized:
            return sp

    return None


class ScanConfirmView(discord.ui.View):
    """Confirm/cancel buttons for a stockpile scan."""

    def __init__(
        self,
        scan_items: list[dict[str, Any]],
        stockpile_id: str,
        stockpile_name: str,
        stockpile_hex: str,
        regiment_id: str,
        discord_user_id: str,
        total_quantity: int,
        item_count: int,
    ):
        super().__init__(timeout=300)
        self.scan_items = scan_items
        self.stockpile_id = stockpile_id
        self.stockpile_name = stockpile_name
        self.stockpile_hex = stockpile_hex
        self.regiment_id = regiment_id
        self.discord_user_id = discord_user_id
        self.total_quantity = total_quantity
        self.item_count = item_count

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if str(interaction.user.id) != self.discord_user_id:
            await interaction.response.send_message(
                "Only the person who uploaded this screenshot can confirm or cancel.",
                ephemeral=True,
            )
            return False
        return True

    @discord.ui.button(emoji="\u2705", style=discord.ButtonStyle.secondary)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.defer()

        # Resolve Discord user to internal user ID
        resolve_result = await mcp_client.call_tool(
            "resolve_discord_user",
            {"discordId": self.discord_user_id},
        )
        resolve_data = _parse_mcp_result(resolve_result)

        if "error" in resolve_data:
            embed = discord.Embed(
                title="Scan Failed",
                description="You need to sign in at [foxhole-quartermaster.com](https://foxhole-quartermaster.com) first.",
                color=0xef4444,
            )
            self._remove_buttons()
            await interaction.edit_original_response(embed=embed, view=self)
            return

        user_id = resolve_data["userId"]

        # Fetch current stockpile inventory before saving (for diff calculation)
        old_inventory: dict[str, int] = {}
        stockpile_result = await mcp_client.call_tool(
            "get_stockpile",
            {"regimentId": self.regiment_id, "stockpileId": self.stockpile_id},
        )
        stockpile_data = _parse_mcp_result(stockpile_result)
        if "error" not in stockpile_data:
            for item in stockpile_data.get("inventory", []):
                key = f"{item['itemCode']}:{item.get('crated', False)}"
                old_inventory[key] = item["quantity"]

        # Save scan results
        save_result = await mcp_client.call_tool(
            "save_scan_results",
            {
                "regimentId": self.regiment_id,
                "userId": user_id,
                "stockpileId": self.stockpile_id,
                "items": self.scan_items,
            },
        )
        save_data = _parse_mcp_result(save_result)

        if "error" in save_data:
            embed = discord.Embed(
                title="Save Failed",
                description=f"Failed to save scan: {save_data['error']}",
                color=0xef4444,
            )
            self._remove_buttons()
            await interaction.edit_original_response(embed=embed, view=self)
            return

        # Compute diffs
        diffs: list[dict[str, Any]] = []
        seen_keys: set[str] = set()
        for item in self.scan_items:
            key = f"{item['itemCode']}:{item.get('crated', False)}"
            seen_keys.add(key)
            old_qty = old_inventory.get(key, 0)
            new_qty = item["quantity"]
            change = new_qty - old_qty
            if change != 0:
                diffs.append({
                    "displayName": item.get("displayName", item["itemCode"]),
                    "change": change,
                })

        # Items that were in old inventory but not in new scan (removed)
        for key, old_qty in old_inventory.items():
            if key not in seen_keys and old_qty > 0:
                item_code = key.split(":")[0]
                # Find display name from old inventory data
                display = item_code
                for inv_item in stockpile_data.get("inventory", []):
                    if f"{inv_item['itemCode']}:{inv_item.get('crated', False)}" == key:
                        display = inv_item.get("displayName", item_code)
                        break
                diffs.append({"displayName": display, "change": -old_qty})

        # Sort: additions first, then removals, by absolute magnitude
        diffs.sort(key=lambda d: (0 if d["change"] > 0 else 1, -abs(d["change"])))

        # Build diff text using ANSI color codes for Discord
        # \x1b[1;32m = bold green, \x1b[31m = red, \x1b[0m = reset
        diff_lines: list[str] = []
        for d in diffs:
            if d["change"] > 0:
                diff_lines.append(f"\x1b[1;32m+{d['change']:,}\x1b[0m {d['displayName']}")
            else:
                diff_lines.append(f"\x1b[1;31m{d['change']:,}\x1b[0m {d['displayName']}")

        # Success embed
        embed = discord.Embed(
            title="Scan Saved",
            color=0x22c55e,
        )
        embed.add_field(name="Stockpile", value=f"{self.stockpile_name} ({self.stockpile_hex})", inline=False)

        if diff_lines:
            # Wrap in ANSI code block for colored text
            # Account for ```ansi\n...\n``` wrapper (12 chars) in the 1024 limit
            inner_text = "\n".join(diff_lines)
            if len(inner_text) > 1000:
                # Truncate and indicate more
                truncated: list[str] = []
                length = 0
                for line in diff_lines:
                    if length + len(line) + 1 > 950:
                        truncated.append(f"...and {len(diff_lines) - len(truncated)} more")
                        break
                    truncated.append(line)
                    length += len(line) + 1
                inner_text = "\n".join(truncated)
            diff_text = f"```ansi\n{inner_text}\n```"
            embed.add_field(name="Changes", value=diff_text, inline=False)
        else:
            embed.add_field(name="Changes", value="No changes from previous scan", inline=False)

        embed.set_footer(text=f"Saved by {interaction.user.display_name}")

        self._remove_buttons()
        await interaction.edit_original_response(embed=embed, view=self)

    @discord.ui.button(emoji="\u274c", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        embed = discord.Embed(
            title="Scan Cancelled",
            description="The scan results were discarded.",
            color=0x6b7280,
        )
        self._remove_buttons()
        await interaction.response.edit_message(embed=embed, view=self)

    async def on_timeout(self) -> None:
        embed = discord.Embed(
            title="Scan Expired",
            description="The scan confirmation timed out. Upload the screenshot again to retry.",
            color=0x6b7280,
        )
        self._remove_buttons()
        try:
            await self.message.edit(embed=embed, view=self)
        except Exception:
            pass

    def _remove_buttons(self) -> None:
        self.clear_items()


async def handle_scanner_message(client: discord.Client, message: discord.Message) -> None:
    """Process a message in the scanner channel.

    Filters for image attachments, sends them to the OCR scanner,
    matches the detected stockpile, and presents confirm/cancel buttons.
    """
    # Filter to image attachments only
    images = [a for a in message.attachments if a.content_type and a.content_type.startswith("image/")]
    if not images:
        return

    guild_id = str(message.guild.id)  # type: ignore[union-attr]
    image = images[0]  # Process first image only

    logger.info("scanner", f"Processing screenshot from {message.author.name}", {
        "guild": message.guild.name if message.guild else None,
        "filename": image.filename,
        "size": image.size,
    })

    # Send "Scanning..." reply
    scanning_embed = discord.Embed(
        title="Scanning...",
        description="Processing your stockpile screenshot...",
        color=0x3b82f6,
    )
    reply = await message.reply(embed=scanning_embed)

    try:
        # Call OCR scanner
        scan_result = await mcp_client.call_tool(
            "scan_screenshot",
            {"imageUrl": image.url},
        )
        scan_data = _parse_mcp_result(scan_result)

        if "error" in scan_data:
            error_msg = scan_data["error"]
            if "timeout" in error_msg.lower():
                error_msg = "Scanner service timed out. Please try again."
            elif "download" in error_msg.lower():
                error_msg = "Could not download the image. Please try uploading again."
            else:
                error_msg = f"Scanner error: {error_msg}"

            embed = discord.Embed(
                title="Scan Failed",
                description=error_msg,
                color=0xef4444,
            )
            await reply.edit(embed=embed)
            return

        items = scan_data.get("items", [])
        if not items:
            embed = discord.Embed(
                title="No Items Detected",
                description="No stockpile items were detected in this image. Make sure the screenshot shows a stockpile inventory screen.",
                color=0xf59e0b,
            )
            await reply.edit(embed=embed)
            return

        item_count = scan_data["itemCount"]
        total_quantity = scan_data["totalQuantity"]
        detected_name = scan_data.get("detectedName")

        # Fetch regiment stockpiles to match against
        stockpiles_result = await mcp_client.call_tool(
            "list_stockpiles",
            {"regimentId": guild_id},
        )
        stockpiles_data = _parse_mcp_result(stockpiles_result)
        stockpiles = stockpiles_data.get("stockpiles", [])

        matched = _match_stockpile(detected_name, stockpiles)

        if matched:
            # Build confirmation embed
            embed = discord.Embed(
                title="Stockpile Scan",
                color=0x3b82f6,
            )
            embed.add_field(name="Region", value=matched.get("locationName") or "—", inline=True)
            embed.add_field(name="Zone", value=matched["hex"], inline=True)
            embed.add_field(name="Stockpile", value=matched["name"], inline=False)
            embed.add_field(name="Item Types", value=str(item_count), inline=True)
            embed.add_field(name="Total Crates", value=f"{total_quantity:,}", inline=True)
            embed.set_footer(text="Confirm to save or cancel to discard")

            view = ScanConfirmView(
                scan_items=items,
                stockpile_id=matched["id"],
                stockpile_name=matched["name"],
                stockpile_hex=matched["hex"],
                regiment_id=guild_id,
                discord_user_id=str(message.author.id),
                total_quantity=total_quantity,
                item_count=item_count,
            )
            await reply.edit(embed=embed, view=view)
            view.message = reply
        else:
            # No stockpile match
            description = f"Detected **{item_count}** item types (**{total_quantity:,}** total crates) but couldn't match to an existing stockpile."
            if detected_name:
                description += f"\n\nDetected name: **{detected_name}**"
            description += "\n\nCreate this stockpile on the [web app](https://foxhole-quartermaster.com) first, then try scanning again."

            embed = discord.Embed(
                title="Stockpile Not Found",
                description=description,
                color=0xf59e0b,
            )
            await reply.edit(embed=embed)

    except discord.Forbidden:
        logger.warn("scanner", "Missing permissions to send messages in scanner channel")
    except Exception as e:
        logger.error("scanner", f"Error processing scanner message: {e}")
        try:
            embed = discord.Embed(
                title="Scan Error",
                description="An unexpected error occurred while processing the screenshot. Please try again.",
                color=0xef4444,
            )
            await reply.edit(embed=embed)
        except Exception:
            pass
