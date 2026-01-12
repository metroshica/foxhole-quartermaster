import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Target, Clock, Boxes } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { DashboardClient } from "@/components/features/dashboard/dashboard-client";

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

  const [stockpileCount, totalItems, operationCount, lastStockpile] = await Promise.all([
    prisma.stockpile.count({
      where: { regimentId },
    }),
    // Sum total quantities across all items
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
    : "Never";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(" ")[0] || "Soldier"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your regiment&apos;s logistics.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stockpiles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockpileCount}</div>
            <p className="text-xs text-muted-foreground">
              across all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalItems._sum.quantity || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              items in inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/operations" className="hover:underline">
                planned or in progress
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastUpdated}</div>
            <p className="text-xs text-muted-foreground">
              {lastStockpile ? "most recent scan" : "no scans yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <DashboardClient />
    </div>
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
