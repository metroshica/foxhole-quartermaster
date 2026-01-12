"use client";

import { useCallback, useState } from "react";
import { InventorySearch } from "./inventory-search";
import { RecentStockpiles } from "./recent-stockpiles";
import { QuickUpload } from "./quick-upload";

export function DashboardClient() {
  // Use a refresh trigger to animate data refresh in child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSaveSuccess = useCallback(() => {
    // Increment trigger to smoothly refresh inventory and stockpiles
    setRefreshTrigger(t => t + 1);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left Column - Inventory (narrower, 2/5) */}
      <div className="lg:col-span-2 space-y-6">
        <InventorySearch refreshTrigger={refreshTrigger} />
        <RecentStockpiles refreshTrigger={refreshTrigger} />
      </div>

      {/* Right Column - Quick Scan (larger, 3/5) */}
      <div className="lg:col-span-3 space-y-6">
        <QuickUpload onSaveSuccess={handleSaveSuccess} />
      </div>
    </div>
  );
}
