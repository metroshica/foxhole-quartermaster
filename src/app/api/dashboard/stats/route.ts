import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/dashboard/stats
 *
 * Returns dashboard statistics for the current user's regiment.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { selectedRegimentId: true },
  });

  if (!user?.selectedRegimentId) {
    return NextResponse.json({ error: "No regiment selected" }, { status: 400 });
  }

  const regimentId = user.selectedRegimentId;

  const [stockpileCount, totalItems, operationCount, lastStockpile] = await Promise.all([
    prisma.stockpile.count({
      where: { regimentId },
    }),
    prisma.stockpileItem.aggregate({
      where: { stockpile: { regimentId } },
      _sum: { quantity: true },
    }),
    prisma.operation.count({
      where: { regimentId, status: { in: ["PLANNING", "ACTIVE"] } },
    }),
    prisma.stockpile.findFirst({
      where: { regimentId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const lastUpdated = lastStockpile?.updatedAt
    ? formatRelativeTime(lastStockpile.updatedAt)
    : null;

  return NextResponse.json({
    stockpileCount,
    totalItems: totalItems._sum.quantity || 0,
    operationCount,
    lastUpdated,
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
