"use client";

import { useCallback, useState } from "react";
import { InventorySearch } from "./inventory-search";
import { RecentStockpiles } from "./recent-stockpiles";
import { QuickUpload } from "./quick-upload";
import { DashboardStats } from "./dashboard-stats";

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
    </div>
  );
}
