/**
 * Activity Notification Service
 *
 * Sends formatted Discord embed messages to a regiment's configured activity channel
 * when activities happen (scans, refreshes, production, operations).
 *
 * All notifications are fire-and-forget: failures are logged but never block API responses.
 */

import { prisma } from "@/lib/db/prisma";
import { sendChannelMessage, type DiscordEmbed } from "@/lib/discord/api";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

const COLORS = {
  SCAN: 0x3b82f6, // Blue
  STOCKPILE_REFRESH: 0x14b8a6, // Teal
  PRODUCTION: 0x22c55e, // Green
  OPERATION: 0xf59e0b, // Orange
} as const;

type ActivityType = keyof typeof COLORS;

interface ScanActivity {
  type: "SCAN";
  userName: string;
  stockpileName: string;
  hex: string;
  itemCount: number;
}

interface RefreshActivity {
  type: "STOCKPILE_REFRESH";
  userName: string;
  stockpileName: string;
  hex: string;
}

interface ProductionActivity {
  type: "PRODUCTION";
  userName: string;
  orderName: string;
  items: Array<{ itemCode: string; quantity: number }>;
}

interface OperationActivity {
  type: "OPERATION";
  userName: string;
  operationName: string;
  action: "created" | "started" | "completed" | "cancelled";
  location?: string | null;
}

type Activity = ScanActivity | RefreshActivity | ProductionActivity | OperationActivity;

function buildEmbed(activity: Activity): DiscordEmbed {
  const embed: DiscordEmbed = {
    color: COLORS[activity.type],
    timestamp: new Date().toISOString(),
  };

  switch (activity.type) {
    case "SCAN": {
      embed.description = `**${activity.userName}** scanned **${activity.stockpileName}** — ${activity.hex}`;
      embed.fields = [{ name: "Items", value: `${activity.itemCount} items detected`, inline: true }];
      embed.footer = { text: "Stockpile Scan" };
      break;
    }
    case "STOCKPILE_REFRESH": {
      embed.description = `**${activity.userName}** refreshed **${activity.stockpileName}** — ${activity.hex}`;
      embed.fields = [{ name: "Points", value: "+10", inline: true }];
      embed.footer = { text: "Stockpile Refresh" };
      break;
    }
    case "PRODUCTION": {
      const itemLines = activity.items
        .map((i) => `${i.quantity}x ${getItemDisplayName(i.itemCode)}`)
        .join(", ");
      embed.description = `**${activity.userName}** produced **${itemLines}** for *${activity.orderName}*`;
      embed.footer = { text: "Production Update" };
      break;
    }
    case "OPERATION": {
      const actionText =
        activity.action === "created" ? "created operation" :
        activity.action === "started" ? "started operation" :
        activity.action === "completed" ? "completed operation" :
        "cancelled operation";
      embed.description = `**${activity.userName}** ${actionText} **${activity.operationName}**`;
      if (activity.location) {
        embed.fields = [{ name: "Location", value: activity.location, inline: true }];
      }
      embed.footer = { text: "Operation Update" };
      break;
    }
  }

  return embed;
}

/**
 * Send an activity notification to the regiment's configured Discord channel.
 * Returns immediately (fire-and-forget). Errors are logged but never thrown.
 */
export function notifyActivity(regimentId: string, activity: Activity): void {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  // Run async work without awaiting — fire and forget
  (async () => {
    try {
      const regiment = await prisma.regiment.findUnique({
        where: { discordId: regimentId },
        select: { activityChannelId: true },
      });

      if (!regiment?.activityChannelId) return;

      const embed = buildEmbed(activity);
      await sendChannelMessage(regiment.activityChannelId, botToken, embed);
    } catch (error) {
      console.error("Failed to send activity notification:", error);
    }
  })();
}
