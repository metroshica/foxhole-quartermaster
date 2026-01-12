import { NextRequest, NextResponse } from "next/server";

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
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Forward the image to the scanner service
    const scannerFormData = new FormData();
    scannerFormData.append("image", image);

    // Optional: pass faction filter if provided
    const faction = formData.get("faction");
    if (faction) {
      scannerFormData.append("faction", faction.toString());
    }

    const response = await fetch(`${SCANNER_URL}/ocr/scan_image`, {
      method: "POST",
      body: scannerFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Scanner service error:", errorText);
      return NextResponse.json(
        { error: "Scanner service error", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

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
