import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getMcpClient } from "../../mcp/client.js";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Stats command
const statsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get regiment dashboard overview"),
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const mcp = getMcpClient();
      const result = await mcp.callTool("get_dashboard_stats", {
        regimentId: interaction.guildId,
      });

      const content = result.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("Unexpected response type");
      }

      const stats = JSON.parse(content.text);

      const embed = new EmbedBuilder()
        .setTitle("📊 Regiment Dashboard")
        .setColor(0x5865f2)
        .addFields(
          { name: "📦 Stockpiles", value: stats.stockpileCount.toString(), inline: true },
          { name: "📋 Total Items", value: stats.totalItems.toLocaleString(), inline: true },
          { name: "⚔️ Active Operations", value: stats.activeOperationCount.toString(), inline: true },
          { name: "🔨 Production Orders", value: stats.pendingProductionCount.toString(), inline: true },
          { name: "📷 Scans (24h)", value: stats.scansLast24Hours.toString(), inline: true },
          { name: "🕐 Last Updated", value: stats.lastUpdated || "Never", inline: true }
        );

      if (stats.lastUpdatedStockpile) {
        embed.setFooter({ text: `Last scan: ${stats.lastUpdatedStockpile}` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching stats:", error);
      await interaction.editReply("Failed to fetch regiment stats. Please try again.");
    }
  },
};

// Inventory command
const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Search regiment inventory")
    .addStringOption((option) =>
      option
        .setName("search")
        .setDescription("Search term (item name, code, or slang like 'bmat', 'mammon')")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Filter by category")
        .setRequired(false)
        .addChoices(
          { name: "All", value: "all" },
          { name: "Vehicles", value: "vehicles" }
        )
    ) as SlashCommandBuilder,
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const search = interaction.options.getString("search");
    const category = interaction.options.getString("category");

    try {
      const mcp = getMcpClient();
      const result = await mcp.callTool("search_inventory", {
        regimentId: interaction.guildId,
        query: search || undefined,
        category: category || undefined,
        limit: 15,
      });

      const content = result.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("Unexpected response type");
      }

      const data = JSON.parse(content.text);

      if (data.items.length === 0) {
        await interaction.editReply(search ? `No items found matching "${search}".` : "No items in inventory.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(search ? `🔍 Search: "${search}"` : "📦 Regiment Inventory")
        .setColor(0x5865f2)
        .setDescription(
          data.items
            .slice(0, 15)
            .map((item: { displayName: string; totalQuantity: number; stockpileCount: number; matchedTag?: string }) => {
              const tag = item.matchedTag ? ` \`${item.matchedTag}\`` : "";
              return `**${item.displayName}**${tag}: ${item.totalQuantity.toLocaleString()} (${item.stockpileCount} stockpile${item.stockpileCount !== 1 ? "s" : ""})`;
            })
            .join("\n")
        )
        .setFooter({ text: `Showing ${Math.min(15, data.items.length)} of ${data.resultCount} items` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error searching inventory:", error);
      await interaction.editReply("Failed to search inventory. Please try again.");
    }
  },
};

// Stockpiles command
const stockpilesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stockpiles")
    .setDescription("List all stockpiles")
    .addStringOption((option) =>
      option
        .setName("hex")
        .setDescription("Filter by hex/region name")
        .setRequired(false)
    ) as SlashCommandBuilder,
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const hex = interaction.options.getString("hex");

    try {
      const mcp = getMcpClient();
      const result = await mcp.callTool("list_stockpiles", {
        regimentId: interaction.guildId,
        hex: hex || undefined,
      });

      const content = result.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("Unexpected response type");
      }

      const data = JSON.parse(content.text);

      if (data.stockpiles.length === 0) {
        await interaction.editReply("No stockpiles found.");
        return;
      }

      const getFreshnessEmoji = (status: string) => {
        switch (status) {
          case "fresh": return "🟢";
          case "aging": return "🟡";
          case "expiring_soon": return "🟠";
          case "expired": return "🔴";
          default: return "⚪";
        }
      };

      const embed = new EmbedBuilder()
        .setTitle(hex ? `📦 Stockpiles in ${hex}` : "📦 All Stockpiles")
        .setColor(0x5865f2)
        .setDescription(
          data.stockpiles
            .slice(0, 10)
            .map((s: { name: string; location: string; type: string; totalItems: number; lastScanRelative: string; freshnessStatus: string }) => {
              const emoji = getFreshnessEmoji(s.freshnessStatus);
              return `${emoji} **${s.name}** (${s.type})\n   ${s.location} • ${s.totalItems.toLocaleString()} items • ${s.lastScanRelative}`;
            })
            .join("\n\n")
        )
        .setFooter({ text: `${data.stockpileCount} stockpile(s) total` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error listing stockpiles:", error);
      await interaction.editReply("Failed to list stockpiles. Please try again.");
    }
  },
};

// Production command
const productionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("production")
    .setDescription("View production orders")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("Filter by status")
        .setRequired(false)
        .addChoices(
          { name: "Pending", value: "PENDING" },
          { name: "In Progress", value: "IN_PROGRESS" },
          { name: "Ready for Pickup", value: "READY_FOR_PICKUP" },
          { name: "Completed", value: "COMPLETED" }
        )
    ) as SlashCommandBuilder,
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const status = interaction.options.getString("status");

    try {
      const mcp = getMcpClient();
      const result = await mcp.callTool("list_production_orders", {
        regimentId: interaction.guildId,
        status: status || undefined,
        limit: 10,
      });

      const content = result.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("Unexpected response type");
      }

      const data = JSON.parse(content.text);

      if (data.orders.length === 0) {
        await interaction.editReply(status ? `No ${status.toLowerCase().replace("_", " ")} orders.` : "No production orders.");
        return;
      }

      const getStatusEmoji = (s: string) => {
        switch (s) {
          case "PENDING": return "⏳";
          case "IN_PROGRESS": return "🔨";
          case "READY_FOR_PICKUP": return "✅";
          case "COMPLETED": return "✔️";
          default: return "❓";
        }
      };

      const getPriorityEmoji = (p: number) => {
        switch (p) {
          case 3: return "🔴";
          case 2: return "🟠";
          case 1: return "🟡";
          default: return "⚪";
        }
      };

      const embed = new EmbedBuilder()
        .setTitle("🔨 Production Orders")
        .setColor(0x5865f2)
        .setDescription(
          data.orders
            .map((o: { name: string; status: string; priority: number; progressPercent: number; isMpf: boolean; timeRemaining?: string; createdRelative: string }) => {
              const statusEmoji = getStatusEmoji(o.status);
              const priorityEmoji = getPriorityEmoji(o.priority);
              const mpf = o.isMpf ? " [MPF]" : "";
              const timer = o.timeRemaining ? ` ⏱️ ${o.timeRemaining}` : "";
              return `${statusEmoji} ${priorityEmoji} **${o.name}**${mpf}\n   ${o.progressPercent}% complete${timer} • ${o.createdRelative}`;
            })
            .join("\n\n")
        )
        .setFooter({ text: `${data.orderCount} order(s)` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error listing production orders:", error);
      await interaction.editReply("Failed to list production orders. Please try again.");
    }
  },
};

// Operations command
const operationsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("operations")
    .setDescription("View operations")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("Filter by status")
        .setRequired(false)
        .addChoices(
          { name: "Planning", value: "PLANNING" },
          { name: "Active", value: "ACTIVE" },
          { name: "Completed", value: "COMPLETED" }
        )
    ) as SlashCommandBuilder,
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const status = interaction.options.getString("status");

    try {
      const mcp = getMcpClient();
      const result = await mcp.callTool("list_operations", {
        regimentId: interaction.guildId,
        status: status || undefined,
        limit: 10,
      });

      const content = result.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("Unexpected response type");
      }

      const data = JSON.parse(content.text);

      if (data.operations.length === 0) {
        await interaction.editReply(status ? `No ${status.toLowerCase()} operations.` : "No operations.");
        return;
      }

      const getStatusEmoji = (s: string) => {
        switch (s) {
          case "PLANNING": return "📝";
          case "ACTIVE": return "⚔️";
          case "COMPLETED": return "✅";
          case "CANCELLED": return "❌";
          default: return "❓";
        }
      };

      const embed = new EmbedBuilder()
        .setTitle("⚔️ Operations")
        .setColor(0x5865f2)
        .setDescription(
          data.operations
            .map((o: { name: string; status: string; location?: string; scheduledForDisplay?: string; requirementCount: number }) => {
              const statusEmoji = getStatusEmoji(o.status);
              const location = o.location ? ` @ ${o.location}` : "";
              const scheduled = o.scheduledForDisplay ? ` • ${o.scheduledForDisplay}` : "";
              return `${statusEmoji} **${o.name}**${location}\n   ${o.requirementCount} requirements${scheduled}`;
            })
            .join("\n\n")
        )
        .setFooter({ text: `${data.operationCount} operation(s)` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error listing operations:", error);
      await interaction.editReply("Failed to list operations. Please try again.");
    }
  },
};

// Help command
const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot help and available commands"),
  execute: async (interaction) => {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Foxhole Quartermaster Bot")
      .setColor(0x5865f2)
      .setDescription(
        "I help manage your regiment's logistics! You can use slash commands or mention me with a question.\n\n" +
        "**Slash Commands:**\n" +
        "`/stats` - Regiment dashboard overview\n" +
        "`/inventory [search]` - Search inventory items\n" +
        "`/stockpiles [hex]` - List stockpiles\n" +
        "`/production [status]` - View production orders\n" +
        "`/operations [status]` - View operations\n\n" +
        "**Natural Language:**\n" +
        "Mention me to ask questions like:\n" +
        "• \"How many crates of 12.7 do we have?\"\n" +
        "• \"Where are our mammons stored?\"\n" +
        "• \"What do we need for Operation Thunder?\"\n" +
        "• \"Show me pending production orders\""
      )
      .setFooter({ text: "Powered by Gemini AI" });

    await interaction.reply({ embeds: [embed] });
  },
};

// Export all commands
export const commands: Command[] = [
  statsCommand,
  inventoryCommand,
  stockpilesCommand,
  productionCommand,
  operationsCommand,
  helpCommand,
];

// Create a map for quick lookup
export const commandHandlers = new Map<string, (interaction: ChatInputCommandInteraction) => Promise<void>>();
for (const cmd of commands) {
  commandHandlers.set(cmd.data.name, cmd.execute);
}
