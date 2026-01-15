import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

// Points awarded per refresh action
const REFRESH_POINTS = 10;

interface UnifiedLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalPoints: number;
  scanPoints: number;
  productionPoints: number;
  refreshPoints: number;
  activityCount: number;
}

/**
 * GET /api/leaderboard/unified
 * Get unified leaderboard combining scans, production, and refreshes
 *
 * Query params:
 * - period: "weekly" | "war" (default: "weekly")
 * - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
  return withSpan("leaderboard.unified", async () => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { selectedRegimentId: true },
      });

      if (!user?.selectedRegimentId) {
        return NextResponse.json(
          { error: "No regiment selected" },
          { status: 400 }
        );
      }

      const { searchParams } = new URL(request.url);
      const period = searchParams.get("period") || "weekly";
      const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

      // Build date filter based on period
      let dateFilter: Date | undefined;
      let warNumberFilter: number | undefined;

      if (period === "weekly") {
        // Start of current week (Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        dateFilter = new Date(now);
        dateFilter.setDate(now.getDate() - dayOfWeek);
        dateFilter.setHours(0, 0, 0, 0);
      } else if (period === "war") {
        // Filter by current war number
        try {
          const war = await getCurrentWar();
          warNumberFilter = war.warNumber;
        } catch {
          // Fall back to all-time if war API fails
        }
      }

      // Map to accumulate points by user
      const userPoints = new Map<
        string,
        {
          scanPoints: number;
          productionPoints: number;
          refreshPoints: number;
          activityCount: number;
        }
      >();

      // ===========================================
      // 1. Calculate scan points
      // ===========================================
      const stockpiles = await prisma.stockpile.findMany({
        where: { regimentId: user.selectedRegimentId },
        select: { id: true },
      });
      const stockpileIds = stockpiles.map((s) => s.id);

      if (stockpileIds.length > 0) {
        const scanWhereClause = {
          stockpileId: { in: stockpileIds },
          ...(dateFilter && { createdAt: { gte: dateFilter } }),
          ...(warNumberFilter && { warNumber: warNumberFilter }),
        };

        // Get all scans in the period
        const scans = await prisma.stockpileScan.findMany({
          where: scanWhereClause,
          include: {
            scannedBy: {
              select: { id: true },
            },
            scanItems: true,
          },
          orderBy: [{ stockpileId: "asc" }, { createdAt: "asc" }],
        });

        // Group scans by stockpile for sequential diff calculation
        const scansByStockpile = new Map<string, typeof scans>();
        for (const scan of scans) {
          const existing = scansByStockpile.get(scan.stockpileId) || [];
          existing.push(scan);
          scansByStockpile.set(scan.stockpileId, existing);
        }

        // Calculate scan points (sum of absolute inventory changes)
        for (const [stockpileId, stockpileScans] of scansByStockpile) {
          const firstScan = stockpileScans[0];
          if (firstScan) {
            const previousScan = await prisma.stockpileScan.findFirst({
              where: {
                stockpileId,
                createdAt: { lt: firstScan.createdAt },
              },
              include: { scanItems: true },
              orderBy: { createdAt: "desc" },
            });

            let previousItems = new Map<string, number>();
            if (previousScan) {
              for (const item of previousScan.scanItems) {
                const key = `${item.itemCode}-${item.crated}`;
                previousItems.set(key, item.quantity);
              }
            }

            for (const scan of stockpileScans) {
              const currentItems = new Map<string, number>();
              for (const item of scan.scanItems) {
                const key = `${item.itemCode}-${item.crated}`;
                currentItems.set(key, item.quantity);
              }

              let totalChange = 0;
              const allKeys = new Set([
                ...currentItems.keys(),
                ...previousItems.keys(),
              ]);

              for (const key of allKeys) {
                const current = currentItems.get(key) || 0;
                const previous = previousItems.get(key) || 0;
                totalChange += Math.abs(current - previous);
              }

              const userId = scan.scannedBy.id;
              const existing = userPoints.get(userId) || {
                scanPoints: 0,
                productionPoints: 0,
                refreshPoints: 0,
                activityCount: 0,
              };
              existing.scanPoints += totalChange;
              existing.activityCount += 1;
              userPoints.set(userId, existing);

              previousItems = currentItems;
            }
          }
        }
      }

      // ===========================================
      // 2. Calculate production points
      // ===========================================
      const orders = await prisma.productionOrder.findMany({
        where: { regimentId: user.selectedRegimentId },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        const productionWhereClause = {
          orderId: { in: orderIds },
          ...(dateFilter && { createdAt: { gte: dateFilter } }),
          ...(warNumberFilter && { warNumber: warNumberFilter }),
        };

        const productionAggregates =
          await prisma.productionContribution.groupBy({
            by: ["userId"],
            where: productionWhereClause,
            _sum: {
              quantity: true,
            },
            _count: {
              id: true,
            },
          });

        for (const agg of productionAggregates) {
          const existing = userPoints.get(agg.userId) || {
            scanPoints: 0,
            productionPoints: 0,
            refreshPoints: 0,
            activityCount: 0,
          };
          existing.productionPoints += agg._sum.quantity || 0;
          existing.activityCount += agg._count.id;
          userPoints.set(agg.userId, existing);
        }
      }

      // ===========================================
      // 3. Calculate refresh points
      // ===========================================
      if (stockpileIds.length > 0) {
        const refreshWhereClause = {
          stockpileId: { in: stockpileIds },
          ...(dateFilter && { createdAt: { gte: dateFilter } }),
          ...(warNumberFilter && { warNumber: warNumberFilter }),
        };

        const refreshAggregates = await prisma.stockpileRefresh.groupBy({
          by: ["refreshedById"],
          where: refreshWhereClause,
          _count: {
            id: true,
          },
        });

        for (const agg of refreshAggregates) {
          const existing = userPoints.get(agg.refreshedById) || {
            scanPoints: 0,
            productionPoints: 0,
            refreshPoints: 0,
            activityCount: 0,
          };
          existing.refreshPoints += agg._count.id * REFRESH_POINTS;
          existing.activityCount += agg._count.id;
          userPoints.set(agg.refreshedById, existing);
        }
      }

      // ===========================================
      // 4. Build leaderboard entries
      // ===========================================
      if (userPoints.size === 0) {
        return NextResponse.json({
          entries: [],
          currentUserRank: null,
          period,
          currentUserId: session.user.id,
        });
      }

      // Get user details for all contributors
      const userIds = Array.from(userPoints.keys());
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Build and sort leaderboard entries
      const allEntries: UnifiedLeaderboardEntry[] = Array.from(
        userPoints.entries()
      )
        .map(([userId, points]) => {
          const userData = userMap.get(userId);
          const totalPoints =
            points.scanPoints + points.productionPoints + points.refreshPoints;
          return {
            rank: 0,
            userId,
            userName: userData?.name || "Unknown",
            userAvatar: userData?.image || null,
            totalPoints,
            scanPoints: points.scanPoints,
            productionPoints: points.productionPoints,
            refreshPoints: points.refreshPoints,
            activityCount: points.activityCount,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

      // Get top entries and assign ranks
      const entries = allEntries
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Find current user's rank if not in top entries
      let currentUserRank: UnifiedLeaderboardEntry | null = null;
      const userIndex = allEntries.findIndex(
        (e) => e.userId === session.user.id
      );
      if (userIndex >= 0 && !entries.find((e) => e.userId === session.user.id)) {
        currentUserRank = {
          ...allEntries[userIndex],
          rank: userIndex + 1,
        };
      }

      addSpanAttributes({
        "leaderboard.period": period,
        "leaderboard.entry_count": entries.length,
      });

      return NextResponse.json({
        entries,
        currentUserRank,
        period,
        currentUserId: session.user.id,
      });
    } catch (error) {
      console.error("Error fetching unified leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }
  });
}
