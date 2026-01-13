"use client";

import { useCallback, useState } from "react";
import { InventorySearch } from "./inventory-search";
import { RecentStockpiles } from "./recent-stockpiles";
import { QuickUpload } from "./quick-upload";
import { DashboardStats } from "./dashboard-stats";
import { ActivityFeed } from "@/components/features/activity/activity-feed";
import { ScanLeaderboard } from "@/components/features/leaderboard/scan-leaderboard";
import { ProductionLeaderboard } from "@/components/features/leaderboard/production-leaderboard";

interface DashboardClientProps {
  initialStats: {
    stockpileCount: number;
    totalItems: number;
    operationCount: number;
    lastUpdated: string | null;
  };
}

export function DashboardClient({ initialStats }: DashboardClientProps) {
  // Use a refresh trigger to animate data refresh in child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSaveSuccess = useCallback(() => {
    // Increment trigger to smoothly refresh inventory and stockpiles
    setRefreshTrigger(t => t + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <DashboardStats refreshTrigger={refreshTrigger} initialStats={initialStats} />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Inventory (larger, 3/5) */}
        <div className="lg:col-span-3">
          <InventorySearch refreshTrigger={refreshTrigger} />
        </div>

        {/* Right Column - Quick Scan (smaller, 2/5) */}
        <div className="lg:col-span-2">
          <QuickUpload onSaveSuccess={handleSaveSuccess} compact />
        </div>
      </div>

      {/* Full Width - Scan Status (informational) */}
      <RecentStockpiles refreshTrigger={refreshTrigger} />

      {/* Activity and Leaderboards Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed - takes 1/3 */}
        <div className="lg:col-span-1">
          <ActivityFeed compact limit={5} />
        </div>

        {/* Leaderboards - takes 2/3 */}
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          <ScanLeaderboard compact limit={5} />
          <ProductionLeaderboard compact limit={5} />
        </div>
      </div>
    </div>
  );
}
