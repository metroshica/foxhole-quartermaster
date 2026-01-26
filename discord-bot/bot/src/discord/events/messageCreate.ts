import { Message, ChannelType } from "discord.js";
import { processWithAI } from "../../ai/agent.js";
import { logger } from "../../utils/logger.js";

export async function handleMessageCreate(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check if this is a DM or if the bot was mentioned
  const isDM = message.channel.type === ChannelType.DM;
  const isMentioned = message.mentions.has(message.client.user!);

  if (!isDM && !isMentioned) return;

  // Log message receipt
  const channelName =
    message.channel.type === ChannelType.DM ? "DM" : `#${("name" in message.channel && message.channel.name) || "unknown"}`;
  logger.debug("discord", "Message received", {
    user: `${message.author.username}#${message.author.discriminator}`,
    guild: message.guild?.name || "DM",
    channel: channelName,
    content: message.content.slice(0, 100),
  });

  // Get the actual message content (remove the mention if present)
  let content = message.content;
  if (isMentioned) {
    content = content.replace(/<@!?\d+>/g, "").trim();
    logger.trace("discord", `Stripped mention, content: "${content.slice(0, 50)}"`);
  }

  // Ignore empty messages
  if (!content) {
    await message.reply("How can I help you? Ask me about inventory, operations, or production orders!");
    return;
  }

  // Get regiment context from the guild
  const regimentId = message.guildId;
  if (!regimentId && !isDM) {
    await message.reply("I can only help with regiment data when used in a server.");
    return;
  }

  // Show typing indicator
  if ("sendTyping" in message.channel) {
    await message.channel.sendTyping();
  }

  try {
    logger.time("discord-response");

    // Process with AI
    logger.debug("discord", "Processing AI message with context", {
      userMessage: content,
      regimentId: regimentId || undefined,
      userId: message.author.id,
      userName: message.author.username,
      channelId: message.channelId,
      guildName: message.guild?.name,
    });

    const response = await processWithAI({
      userMessage: content,
      regimentId: regimentId || undefined,
      userId: message.author.id,
      userName: message.author.username,
      channelId: message.channelId,
      guildName: message.guild?.name,
    });

    // Send response (split if too long)
    if (response.length <= 2000) {
      await message.reply(response);
      const responseTime = logger.timeEnd("discord-response");
      logger.debug("discord", `Response sent [${responseTime}ms]`, {
        length: response.length,
      });
    } else {
      // Split into multiple messages
      const chunks = splitMessage(response, 2000);
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          await message.reply(chunks[i]);
        } else if ("send" in message.channel) {
          await message.channel.send(chunks[i]);
        }
      }
      const responseTime = logger.timeEnd("discord-response");
      logger.debug("discord", `Response sent [${responseTime}ms]`, {
        length: response.length,
        chunks: chunks.length,
      });
    }
  } catch (error) {
    logger.error("discord", "Error processing AI message", {
      error: error instanceof Error ? error.message : String(error),
    });
    await message.reply("Sorry, I encountered an error processing your request. Please try again.");
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const lines = text.split("\n");
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      // If single line is too long, split it
      if (line.length > maxLength) {
        let remaining = line;
        while (remaining.length > maxLength) {
          chunks.push(remaining.slice(0, maxLength));
          remaining = remaining.slice(maxLength);
        }
        currentChunk = remaining;
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
