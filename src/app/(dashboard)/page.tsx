import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { DashboardClient } from "@/components/features/dashboard/dashboard-client";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Dashboard Home Page
 *
 * Overview page showing:
 * - Quick stats (stockpiles, items, operations)
 * - Aggregate inventory search with drill-down
 * - Quick upload zone with auto-match
 * - Recent stockpiles with quick update buttons
 *
 * This page requires authentication and a selected regiment.
 */

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect to regiment selection if no regiment selected
  if (!session.user.selectedRegimentId) {
    redirect("/select-regiment");
  }

  // Fetch dashboard stats
  const regimentId = session.user.selectedRegimentId;
  const permissions = session.user.permissions ?? [];
  const canViewStockpiles = permissions.includes(PERMISSIONS.STOCKPILE_VIEW);
  const canViewOperations = permissions.includes(PERMISSIONS.OPERATION_VIEW);

  const [stockpileCount, totalItems, operationCount, lastStockpile] =
    await Promise.all([
      canViewStockpiles
        ? prisma.stockpile.count({ where: { regimentId } })
        : Promise.resolve(0),
      canViewStockpiles
        ? prisma.stockpileItem.aggregate({
            where: { stockpile: { regimentId } },
            _sum: { quantity: true },
          })
        : Promise.resolve({ _sum: { quantity: null } }),
      canViewOperations
        ? prisma.operation.count({
            where: { regimentId, status: { in: ["PLANNING", "ACTIVE"] } },
          })
        : Promise.resolve(0),
      canViewStockpiles
        ? prisma.stockpile.findFirst({
            where: { regimentId },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
          })
        : Promise.resolve(null),
    ]);

  const lastUpdated = lastStockpile?.updatedAt
    ? formatRelativeTime(lastStockpile.updatedAt)
    : null;

  const initialStats = {
    stockpileCount,
    totalItems: totalItems._sum.quantity || 0,
    operationCount,
    lastUpdated,
  };

  // Get user's first name for welcome message
  const userName = session.user.name?.split(" ")[0] || "Soldier";

  return (
    <DashboardClient
      initialStats={initialStats}
      tutorialCompleted={session.user.tutorialCompleted}
      userName={userName}
      permissions={permissions}
    />
  );
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
