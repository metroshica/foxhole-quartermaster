import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { formatRelativeTime } from "../utils/formatters.js";

export function registerStatsTools(server: McpServer): void {
  // get_dashboard_stats - Get regiment overview statistics
  server.tool(
    "get_dashboard_stats",
    "Get regiment overview: stockpile count, total items, active operations, production orders",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
    },
    async ({ regimentId }) => {
      const [
        stockpileCount,
        totalItems,
        activeOperationCount,
        pendingProductionCount,
        lastStockpile,
        recentScans,
      ] = await Promise.all([
        // Count stockpiles
        prisma.stockpile.count({
          where: { regimentId },
        }),
        // Sum all item quantities
        prisma.stockpileItem.aggregate({
          where: { stockpile: { regimentId } },
          _sum: { quantity: true },
        }),
        // Count active operations
        prisma.operation.count({
          where: { regimentId, status: { in: ["PLANNING", "ACTIVE"] } },
        }),
        // Count pending/in-progress production orders
        prisma.productionOrder.count({
          where: {
            regimentId,
            status: { in: ["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP"] },
          },
        }),
        // Get most recently updated stockpile
        prisma.stockpile.findFirst({
          where: { regimentId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true, name: true, hex: true },
        }),
        // Count scans in last 24 hours
        prisma.stockpileScan.count({
          where: {
            stockpile: { regimentId },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const lastUpdated = lastStockpile?.updatedAt
        ? formatRelativeTime(lastStockpile.updatedAt)
        : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              stockpileCount,
              totalItems: totalItems._sum.quantity || 0,
              activeOperationCount,
              pendingProductionCount,
              lastUpdated,
              lastUpdatedStockpile: lastStockpile
                ? `${lastStockpile.hex} - ${lastStockpile.name}`
                : null,
              scansLast24Hours: recentScans,
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_leaderboard - Get contributor leaderboard
  server.tool(
    "get_leaderboard",
    "Get contributor leaderboard for scans and production",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      period: z.enum(["weekly", "monthly", "war"]).optional().describe("Time period for leaderboard"),
      limit: z.number().optional().default(10).describe("Max number of contributors to return"),
    },
    async ({ regimentId, period, limit }) => {
      // Calculate date range based on period
      let startDate: Date | undefined;
      if (period === "weekly") {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === "monthly") {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
      // For "war" period, we'd need war number tracking - skip date filter for now

      // Get scan contributions
      const scanLeaders = await prisma.stockpileScan.groupBy({
        by: ["scannedById"],
        where: {
          stockpile: { regimentId },
          ...(startDate && { createdAt: { gte: startDate } }),
        },
        _count: { id: true },
        _sum: { itemCount: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });

      // Get user details for scan leaders
      const scanUserIds = scanLeaders.map((s) => s.scannedById);
      const scanUsers = await prisma.user.findMany({
        where: { id: { in: scanUserIds } },
        select: { id: true, name: true, discordId: true },
      });

      const scanLeaderboard = scanLeaders.map((leader) => {
        const user = scanUsers.find((u) => u.id === leader.scannedById);
        return {
          userId: leader.scannedById,
          userName: user?.name || "Unknown",
          discordId: user?.discordId,
          scanCount: leader._count.id,
          itemsScanned: leader._sum.itemCount || 0,
        };
      });

      // Get production contributions
      const productionLeaders = await prisma.productionContribution.groupBy({
        by: ["userId"],
        where: {
          order: { regimentId },
          ...(startDate && { createdAt: { gte: startDate } }),
        },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit,
      });

      const prodUserIds = productionLeaders.map((p) => p.userId);
      const prodUsers = await prisma.user.findMany({
        where: { id: { in: prodUserIds } },
        select: { id: true, name: true, discordId: true },
      });

      const productionLeaderboard = productionLeaders.map((leader) => {
        const user = prodUsers.find((u) => u.id === leader.userId);
        return {
          userId: leader.userId,
          userName: user?.name || "Unknown",
          discordId: user?.discordId,
          contributionCount: leader._count.id,
          itemsProduced: leader._sum.quantity || 0,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              period: period || "all-time",
              scanLeaderboard,
              productionLeaderboard,
            }, null, 2),
          },
        ],
      };
    }
  );
}
