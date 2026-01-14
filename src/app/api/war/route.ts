import { NextResponse } from "next/server";
import { getWarStatus } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

/**
 * GET /api/war
 * Get current Foxhole war status
 */
export async function GET() {
  return withSpan("war.status", async () => {
    try {
      const status = await getWarStatus();

      addSpanAttributes({
        "war.number": status.warNumber,
        "war.is_active": status.isActive,
        "war.winner": status.winner,
      });

      return NextResponse.json(status);
    } catch (error) {
      console.error("Failed to fetch war status:", error);
      return NextResponse.json(
        { error: "Failed to fetch war status" },
        { status: 500 }
      );
    }
  });
}
