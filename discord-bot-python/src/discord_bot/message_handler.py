"""Message handler for Discord mentions and DMs."""

import discord

from ..ai.agent import process_with_ai
from ..utils.logger import logger


async def handle_message(client: discord.Client, message: discord.Message) -> None:
    """Handle incoming Discord messages.

    Args:
        client: Discord client instance
        message: Received message
    """
    # Ignore bot messages
    if message.author.bot:
        return

    # Check if this is a DM or if the bot was mentioned directly
    is_dm = isinstance(message.channel, discord.DMChannel)

    # Check for direct mention of the bot (not @everyone or @here)
    assert client.user is not None
    bot_id = client.user.id
    is_mentioned = f"<@{bot_id}>" in message.content or f"<@!{bot_id}>" in message.content

    if not is_dm and not is_mentioned:
        return

    # Log message receipt
    channel_name = "DM" if is_dm else f"#{getattr(message.channel, 'name', 'unknown')}"
    logger.debug("discord", "Message received", {
        "user": f"{message.author.name}#{message.author.discriminator}",
        "guild": message.guild.name if message.guild else "DM",
        "channel": channel_name,
        "content": message.content[:100],
    })

    # Get the actual message content (remove the mention if present)
    content = message.content
    if is_mentioned:
        # Remove all mentions from the message
        import re
        content = re.sub(r"<@!?\d+>", "", content).strip()
        logger.trace("discord", f'Stripped mention, content: "{content[:50]}"')

    # Ignore empty messages
    if not content:
        await message.reply("How can I help you? Ask me about inventory, operations, or production orders!")
        return

    # Get regiment context from the guild
    regiment_id = str(message.guild.id) if message.guild else None
    if not regiment_id and not is_dm:
        await message.reply("I can only help with regiment data when used in a server.")
        return

    # Show typing indicator
    async with message.channel.typing():
        try:
            logger.time("discord-response")

            # Process with AI
            logger.debug("discord", "Processing AI message with context", {
                "userMessage": content,
                "regimentId": regiment_id,
                "userId": str(message.author.id),
                "userName": message.author.name,
                "channelId": str(message.channel.id),
                "guildName": message.guild.name if message.guild else None,
            })

            response = await process_with_ai(
                user_message=content,
                regiment_id=regiment_id,
                user_id=str(message.author.id),
                user_name=message.author.name,
                channel_id=str(message.channel.id),
                guild_name=message.guild.name if message.guild else None,
            )

            # Send response (split if too long)
            if len(response) <= 2000:
                await message.reply(response)
                response_time = logger.time_end("discord-response")
                logger.debug("discord", f"Response sent [{response_time}ms]", {
                    "length": len(response),
                })
            else:
                # Split into multiple messages
                chunks = split_message(response, 2000)
                for i, chunk in enumerate(chunks):
                    if i == 0:
                        await message.reply(chunk)
                    else:
                        await message.channel.send(chunk)
                response_time = logger.time_end("discord-response")
                logger.debug("discord", f"Response sent [{response_time}ms]", {
                    "length": len(response),
                    "chunks": len(chunks),
                })

        except Exception as e:
            logger.error("discord", "Error processing AI message", {"error": str(e)})
            await message.reply("Sorry, I encountered an error processing your request. Please try again.")


def split_message(text: str, max_length: int) -> list[str]:
    """Split a message into chunks that fit Discord's limit.

    Args:
        text: Message text to split
        max_length: Maximum length per chunk

    Returns:
        List of message chunks
    """
    chunks: list[str] = []
    current_chunk = ""

    lines = text.split("\n")
    for line in lines:
        if len(current_chunk) + len(line) + 1 > max_length:
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            # If single line is too long, split it
            if len(line) > max_length:
                remaining = line
                while len(remaining) > max_length:
                    chunks.append(remaining[:max_length])
                    remaining = remaining[max_length:]
                current_chunk = remaining
            else:
                current_chunk = line
        else:
            current_chunk += ("\n" if current_chunk else "") + line

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
