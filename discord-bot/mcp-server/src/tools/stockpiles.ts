import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { formatRelativeTime, formatStockpileType } from "../utils/formatters.js";

export function registerStockpileTools(server: McpServer): void {
  // list_stockpiles - Get all stockpiles
  server.tool(
    "list_stockpiles",
    "List all stockpiles with last scan times, item counts, and freshness status",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      hex: z.string().optional().describe("Filter by hex/region name"),
    },
    async ({ regimentId, hex }) => {
      const stockpiles = await prisma.stockpile.findMany({
        where: {
          regimentId,
          ...(hex && { hex: { contains: hex, mode: "insensitive" } }),
        },
        include: {
          items: {
            select: { quantity: true },
          },
          scans: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
              scannedBy: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const result = stockpiles.map((stockpile) => {
        const totalItems = stockpile.items.reduce((sum, item) => sum + item.quantity, 0);
        const lastScan = stockpile.scans[0];
        const lastScanTime = lastScan?.createdAt;

        // Calculate freshness (based on 50-hour expiration)
        let freshnessStatus = "unknown";
        let hoursUntilExpiry: number | null = null;
        if (stockpile.lastRefreshedAt) {
          const hoursSinceRefresh = (Date.now() - stockpile.lastRefreshedAt.getTime()) / (1000 * 60 * 60);
          hoursUntilExpiry = Math.max(0, 50 - hoursSinceRefresh);
          if (hoursUntilExpiry > 24) freshnessStatus = "fresh";
          else if (hoursUntilExpiry > 6) freshnessStatus = "aging";
          else if (hoursUntilExpiry > 0) freshnessStatus = "expiring_soon";
          else freshnessStatus = "expired";
        }

        return {
          id: stockpile.id,
          name: stockpile.name,
          type: formatStockpileType(stockpile.type),
          hex: stockpile.hex,
          locationName: stockpile.locationName,
          location: `${stockpile.hex} - ${stockpile.locationName}`,
          totalItems,
          uniqueItemCount: stockpile.items.length,
          lastScanTime: lastScanTime ? lastScanTime.toISOString() : null,
          lastScanRelative: lastScanTime ? formatRelativeTime(lastScanTime) : "Never",
          lastScannedBy: lastScan?.scannedBy?.name || null,
          lastRefreshedAt: stockpile.lastRefreshedAt?.toISOString() || null,
          freshnessStatus,
          hoursUntilExpiry: hoursUntilExpiry !== null ? Math.round(hoursUntilExpiry * 10) / 10 : null,
          hasCode: !!stockpile.code,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              stockpileCount: result.length,
              stockpiles: result,
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_stockpile - Get detailed stockpile info with inventory
  server.tool(
    "get_stockpile",
    "Get detailed stockpile information including full inventory",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      stockpileId: z.string().optional().describe("Stockpile ID"),
      stockpileName: z.string().optional().describe("Stockpile name (partial match)"),
    },
    async ({ regimentId, stockpileId, stockpileName }) => {
      if (!stockpileId && !stockpileName) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Either stockpileId or stockpileName is required" }),
            },
          ],
          isError: true,
        };
      }

      const stockpile = await prisma.stockpile.findFirst({
        where: {
          regimentId,
          ...(stockpileId && { id: stockpileId }),
          ...(stockpileName && { name: { contains: stockpileName, mode: "insensitive" } }),
        },
        include: {
          items: {
            orderBy: { quantity: "desc" },
          },
          scans: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              createdAt: true,
              itemCount: true,
              scannedBy: { select: { name: true } },
            },
          },
        },
      });

      if (!stockpile) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Stockpile not found" }),
            },
          ],
          isError: true,
        };
      }

      // Import item display names
      const { getItemDisplayName } = await import("../utils/items.js");

      const inventory = stockpile.items.map((item) => ({
        itemCode: item.itemCode,
        displayName: getItemDisplayName(item.itemCode),
        quantity: item.quantity,
        crated: item.crated,
      }));

      const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: stockpile.id,
              name: stockpile.name,
              type: formatStockpileType(stockpile.type),
              hex: stockpile.hex,
              locationName: stockpile.locationName,
              location: `${stockpile.hex} - ${stockpile.locationName}`,
              code: stockpile.code ? "[REDACTED]" : null,
              lastRefreshedAt: stockpile.lastRefreshedAt?.toISOString() || null,
              updatedAt: stockpile.updatedAt.toISOString(),
              totalItems,
              uniqueItemCount: inventory.length,
              inventory,
              recentScans: stockpile.scans.map((scan) => ({
                id: scan.id,
                createdAt: scan.createdAt.toISOString(),
                relativeTime: formatRelativeTime(scan.createdAt),
                itemCount: scan.itemCount,
                scannedBy: scan.scannedBy?.name || "Unknown",
              })),
            }, null, 2),
          },
        ],
      };
    }
  );

  // refresh_stockpile - Mark stockpile as refreshed
  server.tool(
    "refresh_stockpile",
    "Record a stockpile refresh (resets 50-hour expiration timer)",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      stockpileId: z.string().describe("Stockpile ID to refresh"),
      userId: z.string().describe("User ID recording the refresh"),
    },
    async ({ regimentId, stockpileId, userId }) => {
      // Verify stockpile belongs to regiment
      const stockpile = await prisma.stockpile.findFirst({
        where: { id: stockpileId, regimentId },
      });

      if (!stockpile) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Stockpile not found or does not belong to this regiment" }),
            },
          ],
          isError: true,
        };
      }

      // Update stockpile and create refresh record
      const [updated, refresh] = await prisma.$transaction([
        prisma.stockpile.update({
          where: { id: stockpileId },
          data: { lastRefreshedAt: new Date() },
        }),
        prisma.stockpileRefresh.create({
          data: {
            stockpileId,
            refreshedById: userId,
          },
        }),
      ]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              stockpileId: updated.id,
              stockpileName: updated.name,
              refreshedAt: updated.lastRefreshedAt?.toISOString(),
              expiresAt: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
              refreshId: refresh.id,
            }, null, 2),
          },
        ],
      };
    }
  );
}
