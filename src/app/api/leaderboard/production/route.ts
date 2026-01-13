import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCurrentWar } from "@/lib/foxhole/war-api";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  points: number;
  contributionCount: number;
}

/**
 * GET /api/leaderboard/production
 * Get production leaderboard for the current regiment
 *
 * Query params:
 * - period: "weekly" | "war" (default: "weekly")
 * - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
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

    // Get production orders for this regiment
    const orders = await prisma.productionOrder.findMany({
      where: { regimentId: user.selectedRegimentId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length === 0) {
      return NextResponse.json({
        entries: [],
        period,
        currentUserId: session.user.id,
      });
    }

    // Build where clause for contributions
    const whereClause = {
      orderId: { in: orderIds },
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
      ...(warNumberFilter && { warNumber: warNumberFilter }),
    };

    // Aggregate contributions by user using groupBy
    const contributionAggregates = await prisma.productionContribution.groupBy({
      by: ["userId"],
      where: whereClause,
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    if (contributionAggregates.length === 0) {
      return NextResponse.json({
        entries: [],
        period,
        currentUserId: session.user.id,
      });
    }

    // Get user details for all contributors
    const userIds = contributionAggregates.map((c) => c.userId);
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
    const allEntries = contributionAggregates
      .map((agg) => {
        const userData = userMap.get(agg.userId);
        return {
          rank: 0,
          userId: agg.userId,
          userName: userData?.name || "Unknown",
          userAvatar: userData?.image || null,
          points: agg._sum.quantity || 0,
          contributionCount: agg._count.id,
        };
      })
      .sort((a, b) => b.points - a.points);

    // Get top entries and assign ranks
    const entries: LeaderboardEntry[] = allEntries
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Find current user's rank if not in top entries
    let currentUserRank: LeaderboardEntry | null = null;
    const userIndex = allEntries.findIndex((e) => e.userId === session.user.id);
    if (userIndex >= 0 && !entries.find((e) => e.userId === session.user.id)) {
      currentUserRank = {
        ...allEntries[userIndex],
        rank: userIndex + 1,
      };
    }

    return NextResponse.json({
      entries,
      currentUserRank,
      period,
      currentUserId: session.user.id,
    });
  } catch (error) {
    console.error("Error fetching production leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
