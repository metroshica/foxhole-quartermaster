import { NextResponse } from "next/server";
import { getWarStatus } from "@/lib/foxhole/war-api";

/**
 * GET /api/war
 * Get current Foxhole war status
 */
export async function GET() {
  try {
    const status = await getWarStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch war status:", error);
    return NextResponse.json(
      { error: "Failed to fetch war status" },
      { status: 500 }
    );
  }
}
