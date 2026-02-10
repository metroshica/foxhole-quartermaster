"""Message handler for Discord mentions and DMs."""

import re
from datetime import datetime, timedelta, timezone

import discord

from ..ai.agent import process_with_ai
from ..utils.logger import logger


async def fetch_conversation_history(
    message: discord.Message,
    bot_id: int,
    max_messages: int = 10,
    max_age_minutes: int = 30,
) -> list[tuple[str, str]]:
    """Fetch recent conversation history from the Discord channel.

    Collects recent messages between the bot and users that mentioned it,
    to provide multi-turn context for the AI.

    Args:
        message: Current message (excluded from history)
        bot_id: The bot's Discord user ID
        max_messages: Maximum relevant messages to collect
        max_age_minutes: Ignore messages older than this

    Returns:
        List of (role, content) tuples in chronological order.
        role is "user" or "model".
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    history: list[tuple[str, str]] = []

    try:
        async for msg in message.channel.history(limit=20, before=message):
            # Stop if message is too old
            if msg.created_at < cutoff:
                break

            if msg.author.id == bot_id:
                # Bot's own response
                history.append(("model", msg.content))
            elif f"<@{bot_id}>" in msg.content or f"<@!{bot_id}>" in msg.content:
                # User message that mentioned the bot
                content = re.sub(r"<@!?\d+>", "", msg.content).strip()
                if content:
                    history.append(("user", content))
            else:
                # Not part of the bot conversation — skip
                continue

            if len(history) >= max_messages:
                break
    except discord.Forbidden:
        logger.warn("discord", "Missing permissions to read channel history")
    except Exception as e:
        logger.warn("discord", f"Failed to fetch channel history: {e}")

    # channel.history returns newest-first, reverse to chronological
    history.reverse()
    return history


async def handle_message(client: discord.Client, message: discord.Message) -> None:
    """Handle incoming Discord messages.

    Args:
        client: Discord client instance
        message: Received message
    """
    # Ignore bot messages
    if message.author.bot:
        return

    # Testing: only respond to authorized user
    AUTHORIZED_USER_ID = 112967182752768000
    if message.author.id != AUTHORIZED_USER_ID:
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

    # Fetch conversation history for multi-turn context
    conversation_history = await fetch_conversation_history(message, bot_id)

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
                "historyMessages": len(conversation_history),
            })

            response = await process_with_ai(
                user_message=content,
                regiment_id=regiment_id,
                user_id=str(message.author.id),
                user_name=message.author.name,
                channel_id=str(message.channel.id),
                guild_name=message.guild.name if message.guild else None,
                conversation_history=conversation_history,
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
