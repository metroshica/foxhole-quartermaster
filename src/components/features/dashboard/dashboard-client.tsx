"use client";

import { InventorySearch } from "./inventory-search";
import { RecentStockpiles } from "./recent-stockpiles";
import { QuickUpload } from "./quick-upload";

export function DashboardClient() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column */}
      <div className="space-y-6">
        <InventorySearch />
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <QuickUpload />
        <RecentStockpiles />
      </div>
    </div>
  );
}
