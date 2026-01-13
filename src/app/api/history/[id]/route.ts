import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/history/[id]
 * Get full details of a specific scan including all items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's selected regiment
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { selectedRegimentId: true },
    });

    if (!user?.selectedRegimentId) {
      return NextResponse.json({ error: "No regiment selected" }, { status: 400 });
    }

    // Fetch scan with stockpile verification
    const scan = await prisma.stockpileScan.findFirst({
      where: {
        id,
        stockpile: {
          regimentId: user.selectedRegimentId,
        },
      },
      include: {
        stockpile: {
          select: {
            id: true,
            name: true,
            hex: true,
            locationName: true,
            type: true,
          },
        },
        scannedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        scanItems: {
          orderBy: [
            { crated: "desc" },
            { quantity: "desc" },
          ],
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Enrich items with display names
    const items = scan.scanItems.map((item) => ({
      itemCode: item.itemCode,
      displayName: getItemDisplayName(item.itemCode),
      quantity: item.quantity,
      crated: item.crated,
      confidence: item.confidence,
    }));

    return NextResponse.json({
      id: scan.id,
      stockpile: scan.stockpile,
      scanner: scan.scannedBy,
      itemCount: scan.itemCount,
      ocrConfidence: scan.ocrConfidence,
      createdAt: scan.createdAt.toISOString(),
      items,
    });
  } catch (error) {
    console.error("Error fetching scan details:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan details" },
      { status: 500 }
    );
  }
}
