"use client";

import { useCallback, useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { InventorySearch } from "./inventory-search";
import { RecentStockpiles } from "./recent-stockpiles";
import { QuickUpload } from "./quick-upload";
import { DashboardStats } from "./dashboard-stats";
import { TutorialModal } from "./tutorial-modal";
import { ActivityFeed } from "@/components/features/activity/activity-feed";
import { ScanLeaderboard } from "@/components/features/leaderboard/scan-leaderboard";
import { ProductionLeaderboard } from "@/components/features/leaderboard/production-leaderboard";
import { WarStatus } from "@/components/features/war/war-status";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DashboardClientProps {
  initialStats: {
    stockpileCount: number;
    totalItems: number;
    operationCount: number;
    lastUpdated: string | null;
  };
  tutorialCompleted: boolean;
  userName: string;
}

export function DashboardClient({
  initialStats,
  tutorialCompleted,
  userName,
}: DashboardClientProps) {
  // Use a refresh trigger to animate data refresh in child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const { toast } = useToast();

  // Show tutorial on first load if not completed
  useEffect(() => {
    if (!tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [tutorialCompleted]);

  const handleSaveSuccess = useCallback(() => {
    // Increment trigger to smoothly refresh inventory and stockpiles
    setRefreshTrigger((t) => t + 1);
  }, []);

  const handleTutorialComplete = useCallback(async () => {
    setShowTutorial(false);

    // Mark tutorial as completed in the database
    try {
      await fetch("/api/auth/complete-tutorial", { method: "POST" });
    } catch (error) {
      console.error("Failed to mark tutorial complete:", error);
    }

    // Show toast about the help button
    toast({
      title: "Tutorial completed!",
      description:
        "You can always reopen the tutorial by clicking the ? button.",
    });
  }, [toast]);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  return (
    <>
      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />

      <div className="space-y-6">
        {/* Welcome Header with Help Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {userName}
              </h1>
              <p className="text-muted-foreground">
                Here&apos;s what&apos;s happening with your regiment&apos;s
                logistics.
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleOpenTutorial}
              title="Show tutorial"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <WarStatus />
        </div>

        {/* Quick Stats */}
        <DashboardStats
          refreshTrigger={refreshTrigger}
          initialStats={initialStats}
        />

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
    </>
  );
}
