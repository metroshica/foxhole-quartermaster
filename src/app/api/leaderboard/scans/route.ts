import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  points: number;
  scanCount: number;
}

/**
 * GET /api/leaderboard/scans
 * Get scan leaderboard for the current regiment
 *
 * Query params:
 * - period: "weekly" | "war" (default: "weekly")
 * - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
  return withSpan("leaderboard.scans", async () => {
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

    // Get all stockpiles for the regiment
    const stockpiles = await prisma.stockpile.findMany({
      where: { regimentId: user.selectedRegimentId },
      select: { id: true },
    });
    const stockpileIds = stockpiles.map((s) => s.id);

    if (stockpileIds.length === 0) {
      return NextResponse.json({
        entries: [],
        period,
        currentUserId: session.user.id,
      });
    }

    // Build where clause for scans
    const whereClause = {
      stockpileId: { in: stockpileIds },
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
      ...(warNumberFilter && { warNumber: warNumberFilter }),
    };

    // Get all scans in the period, ordered by stockpile and time
    const scans = await prisma.stockpileScan.findMany({
      where: whereClause,
      include: {
        scannedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        scanItems: true,
      },
      orderBy: [{ stockpileId: "asc" }, { createdAt: "asc" }],
    });

    // Calculate points for each scan by computing diffs
    const userPoints = new Map<
      string,
      { points: number; scanCount: number; name: string; image: string | null }
    >();

    // Group scans by stockpile for sequential diff calculation
    const scansByStockpile = new Map<string, typeof scans>();
    for (const scan of scans) {
      const existing = scansByStockpile.get(scan.stockpileId) || [];
      existing.push(scan);
      scansByStockpile.set(scan.stockpileId, existing);
    }

    // For scans at the start of the period, we need to get the previous scan
    // to calculate the diff correctly
    for (const [stockpileId, stockpileScans] of scansByStockpile) {
      // Get the scan just before this period for accurate first diff
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

        // Calculate diff for each scan in order
        let previousItems = new Map<string, number>();
        if (previousScan) {
          for (const item of previousScan.scanItems) {
            const key = `${item.itemCode}-${item.crated}`;
            previousItems.set(key, item.quantity);
          }
        }

        for (const scan of stockpileScans) {
          // Build current items map
          const currentItems = new Map<string, number>();
          for (const item of scan.scanItems) {
            const key = `${item.itemCode}-${item.crated}`;
            currentItems.set(key, item.quantity);
          }

          // Calculate total absolute change (points)
          let totalChange = 0;
          const allKeys = new Set([...currentItems.keys(), ...previousItems.keys()]);

          for (const key of allKeys) {
            const current = currentItems.get(key) || 0;
            const previous = previousItems.get(key) || 0;
            totalChange += Math.abs(current - previous);
          }

          // Add points to user
          const userId = scan.scannedBy.id;
          const existing = userPoints.get(userId) || {
            points: 0,
            scanCount: 0,
            name: scan.scannedBy.name || "Unknown",
            image: scan.scannedBy.image,
          };
          existing.points += totalChange;
          existing.scanCount += 1;
          userPoints.set(userId, existing);

          // Update previous items for next iteration
          previousItems = currentItems;
        }
      }
    }

    // Convert to sorted leaderboard entries
    const entries: LeaderboardEntry[] = Array.from(userPoints.entries())
      .map(([userId, data]) => ({
        rank: 0,
        userId,
        userName: data.name,
        userAvatar: data.image,
        points: data.points,
        scanCount: data.scanCount,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Find current user's rank if not in top entries
    let currentUserRank: LeaderboardEntry | null = null;
    const currentUserData = userPoints.get(session.user.id);
    if (currentUserData) {
      const allSorted = Array.from(userPoints.entries())
        .sort((a, b) => b[1].points - a[1].points);
      const userIndex = allSorted.findIndex(([id]) => id === session.user.id);
      if (userIndex >= 0 && !entries.find((e) => e.userId === session.user.id)) {
        currentUserRank = {
          rank: userIndex + 1,
          userId: session.user.id,
          userName: currentUserData.name,
          userAvatar: currentUserData.image,
          points: currentUserData.points,
          scanCount: currentUserData.scanCount,
        };
      }
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
    console.error("Error fetching scan leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
  });
}
