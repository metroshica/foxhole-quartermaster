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
    console.log(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
    console.log(`Serving ${readyClient.guilds.cache.size} guild(s)`);
  });

  // Interaction (slash commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) {
      console.warn(`No handler for command: ${interaction.commandName}`);
      return;
    }

    try {
      await handler(interaction);
    } catch (error) {
      console.error(`Error handling command ${interaction.commandName}:`, error);
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

  console.log("Registering slash commands...");

  try {
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
      body: commands.map((cmd) => cmd.data.toJSON()),
    });
    console.log(`Successfully registered ${commands.length} slash commands`);
  } catch (error) {
    console.error("Failed to register commands:", error);
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
