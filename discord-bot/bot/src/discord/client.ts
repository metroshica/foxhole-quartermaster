import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
} from "discord.js";
import { config } from "../config.js";
import { commands, commandHandlers } from "./commands/index.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { logger } from "../utils/logger.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      "discord",
      `Logged in as ${readyClient.user.tag} (${readyClient.guilds.cache.size} guild${readyClient.guilds.cache.size !== 1 ? "s" : ""})`
    );

    // Set bot presence
    readyClient.user.setPresence({
      activities: [{ name: "Foxhole logistics", type: 3 }], // type 3 = "Watching"
      status: "online",
    });
  });

  // Interaction (slash commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) {
      logger.warn("discord", `No handler for command: ${interaction.commandName}`);
      return;
    }

    try {
      logger.debug("discord", `Slash command: /${interaction.commandName}`, {
        user: interaction.user.username,
        guild: interaction.guild?.name || "DM",
      });
      await handler(interaction);
    } catch (error) {
      logger.error("discord", `Error handling command ${interaction.commandName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      const reply = {
        content: "An error occurred while processing your command.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // Message create (for @mentions and AI chat)
  client.on(Events.MessageCreate, handleMessageCreate);

  return client;
}

export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.DISCORD_BOT_TOKEN);

  logger.debug("discord", "Registering slash commands...");

  try {
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
      body: commands.map((cmd) => cmd.data.toJSON()),
    });
    logger.info("discord", `Registered ${commands.length} slash commands`);
  } catch (error) {
    logger.error("discord", "Failed to register commands", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function startBot(): Promise<Client> {
  const client = createDiscordClient();

  // Register commands first
  await registerCommands();

  // Login
  await client.login(config.DISCORD_BOT_TOKEN);

  return client;
}
