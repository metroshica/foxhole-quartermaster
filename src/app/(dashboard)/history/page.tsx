import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { ScanHistoryClient } from "@/components/features/history/scan-history-client";

/**
 * Scan History / Audit Page
 *
 * Shows a chronological list of all scans with:
 * - What was added/removed compared to previous scan
 * - Who performed the scan
 * - Expandable details to see full scan contents
 */

export default async function HistoryPage() {
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
          <History className="h-6 w-6" />
          Scan History
        </h1>
        <p className="text-muted-foreground">
          Audit trail of all stockpile scans showing inventory changes over time.
        </p>
      </div>

      {/* History Content */}
      <ScanHistoryClient />
    </div>
  );
}
