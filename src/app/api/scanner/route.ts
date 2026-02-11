import { NextRequest, NextResponse } from "next/server";
import { withSpan, addSpanAttributes, recordException } from "@/lib/telemetry/tracing";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Scanner API Route
 *
 * Proxies screenshot scanning requests to the foxhole-stockpiles service.
 * The scanner service runs as a separate Docker container.
 *
 * POST /api/scanner
 * - Accepts multipart/form-data with an "image" file
 * - Returns JSON with detected items and quantities
 */

const SCANNER_URL = process.env.SCANNER_URL || "http://localhost:8001";

export async function POST(request: NextRequest) {
  return withSpan("scanner.process_image", async (span) => {
    try {
      const authResult = await requirePermission(PERMISSIONS.SCANNER_UPLOAD);
      if (authResult instanceof NextResponse) return authResult;

      const formData = await request.formData();
      const image = formData.get("image") as File | null;

      if (!image) {
        span.setAttribute("error.type", "no_image");
        return NextResponse.json(
          { error: "No image provided" },
          { status: 400 }
        );
      }

      span.setAttribute("image.size_bytes", image.size);
      span.setAttribute("image.type", image.type);

      // Forward the image to the scanner service
      const scannerFormData = new FormData();
      scannerFormData.append("image", image);

      // Optional: pass faction filter if provided
      const faction = formData.get("faction");
      if (faction) {
        scannerFormData.append("faction", faction.toString());
        span.setAttribute("scanner.faction", faction.toString());
      }

      const response = await fetch(`${SCANNER_URL}/ocr/scan_image`, {
        method: "POST",
        body: scannerFormData,
      });

      span.setAttribute("scanner.response_status", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Scanner service error:", errorText);
        span.setAttribute("error.type", "scanner_error");
        span.setAttribute("error.message", errorText);
        return NextResponse.json(
          { error: "Scanner service error", details: errorText },
          { status: response.status }
        );
      }

      const result = await response.json();

      if (!result) {
        span.setAttribute("error.type", "empty_response");
        return NextResponse.json(
          { error: "Scanner returned empty response", details: "The scanner service may not have an output handler configured" },
          { status: 502 }
        );
      }

      // Add scan results to span
      span.setAttribute("scanner.item_count", result.items?.length || 0);
      if (result.stockpileName || result.stockpile_name) {
        span.setAttribute("scanner.stockpile_name", result.stockpileName || result.stockpile_name);
      }

      // Log scanner response for debugging stockpile matching
      console.log("[Scanner API] Response:", JSON.stringify({
        stockpileName: result.stockpileName,
        stockpile_name: result.stockpile_name,
        name: result.name,
        itemCount: result.items?.length || 0,
        rawKeys: Object.keys(result),
        // Show first item structure for debugging
        firstItem: result.items?.[0],
      }, null, 2));

      return NextResponse.json(result);
    } catch (error) {
      console.error("Scanner API error:", error);
      recordException(error, "Scanner API error");

      // Check if it's a connection error (scanner service not running)
      if (error instanceof Error && error.message.includes("fetch")) {
        return NextResponse.json(
          {
            error: "Scanner service unavailable",
            details: "Make sure the scanner Docker container is running: docker compose up scanner",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

/**
 * Health check for the scanner service
 */
export async function GET() {
  try {
    const response = await fetch(`${SCANNER_URL}/health`, {
      method: "GET",
    });

    if (response.ok) {
      return NextResponse.json({ status: "ok", scanner: "connected" });
    } else {
      return NextResponse.json(
        { status: "error", scanner: "unhealthy" },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { status: "error", scanner: "unavailable" },
      { status: 503 }
    );
  }
}
