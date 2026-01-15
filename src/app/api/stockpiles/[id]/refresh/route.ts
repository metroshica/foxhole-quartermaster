import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

// Points awarded per refresh action
const REFRESH_POINTS = 10;

// 50 hours in milliseconds
const REFRESH_EXPIRY_MS = 50 * 60 * 60 * 1000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/stockpiles/[id]/refresh
 * Record a stockpile refresh action (resets the 50-hour expiration timer)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withSpan("stockpiles.refresh", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "stockpile.id": id });

      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's selected regiment
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

      // Verify stockpile exists and belongs to regiment
      const stockpile = await prisma.stockpile.findFirst({
        where: {
          id,
          regimentId: user.selectedRegimentId,
        },
      });

      if (!stockpile) {
        return NextResponse.json(
          { error: "Stockpile not found" },
          { status: 404 }
        );
      }

      // Get current war number for leaderboard tracking
      let warNumber: number | null = null;
      try {
        const war = await getCurrentWar();
        warNumber = war.warNumber;
      } catch (error) {
        console.warn("Failed to get war number for refresh tracking:", error);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + REFRESH_EXPIRY_MS);

      // Create refresh record and update stockpile in a transaction
      const [updatedStockpile] = await prisma.$transaction([
        prisma.stockpile.update({
          where: { id },
          data: {
            lastRefreshedAt: now,
          },
        }),
        prisma.stockpileRefresh.create({
          data: {
            stockpileId: id,
            refreshedById: session.user.id,
            warNumber,
          },
        }),
      ]);

      addSpanAttributes({
        "refresh.points_earned": REFRESH_POINTS,
        "refresh.expires_at": expiresAt.toISOString(),
      });

      return NextResponse.json({
        stockpile: updatedStockpile,
        expiresAt: expiresAt.toISOString(),
        pointsEarned: REFRESH_POINTS,
      });
    } catch (error) {
      console.error("Error refreshing stockpile:", error);
      return NextResponse.json(
        { error: "Failed to refresh stockpile" },
        { status: 500 }
      );
    }
  });
}
