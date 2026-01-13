import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { ActivityFeed } from "@/components/features/activity/activity-feed";

/**
 * Activity Page
 *
 * Shows a live feed of all regiment activity:
 * - Stockpile scans
 * - Production contributions
 * - Operation status changes
 */

export default async function ActivityPage() {
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
          <Activity className="h-6 w-6" />
          Activity Feed
        </h1>
        <p className="text-muted-foreground">
          Live feed of all regiment activity. Auto-refreshes every 30 seconds.
        </p>
      </div>

      {/* Activity Feed - Full width, more items */}
      <ActivityFeed limit={50} autoRefresh={true} />
    </div>
  );
}
