import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { ScanLeaderboard } from "@/components/features/leaderboard/scan-leaderboard";
import { ProductionLeaderboard } from "@/components/features/leaderboard/production-leaderboard";

/**
 * Leaderboard Page
 *
 * Shows contribution rankings for:
 * - Scan activity (stockpile scanning)
 * - Production orders
 */

export default async function LeaderboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect to regiment selection if no regiment selected
  if (!session.user.selectedRegimentId) {
    redirect("/select-regiment");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Track contributions and see who&apos;s keeping the regiment running.
        </p>
      </div>

      {/* Leaderboard Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScanLeaderboard limit={20} />
        <ProductionLeaderboard limit={20} />
      </div>

      {/* Scoring Explanation */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">How Points Work</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Scan Points:</strong> Earn 1 point for every inventory change
            detected. Whether items are added or consumed, keeping stockpiles
            up-to-date earns points.
          </p>
          <p>
            <strong>Production Points:</strong> Earn 1 point for every item you
            produce when updating production order progress.
          </p>
          <p>
            Leaderboards reset at the start of each new war, with weekly rankings
            also available.
          </p>
        </div>
      </div>
    </div>
  );
}
