import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

interface ItemDiff {
  itemCode: string;
  displayName: string;
  previousQuantity: number;
  currentQuantity: number;
  change: number;
  crated: boolean;
}

interface ScanWithDiff {
  id: string;
  stockpileId: string;
  stockpileName: string;
  stockpileHex: string;
  stockpileLocationName: string;
  scannedById: string;
  scannerName: string | null;
  scannerImage: string | null;
  itemCount: number;
  ocrConfidence: number | null;
  createdAt: string;
  diffs: ItemDiff[];
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
}

/**
 * GET /api/history
 * Get scan history with diffs for the current regiment
 */
export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const stockpileId = searchParams.get("stockpileId");

    // Build where clause
    const whereClause: Record<string, unknown> = {
      stockpile: {
        regimentId: user.selectedRegimentId,
      },
    };

    if (stockpileId) {
      whereClause.stockpileId = stockpileId;
    }

    // Fetch scans with items and stockpile info
    const scans = await prisma.stockpileScan.findMany({
      where: whereClause,
      include: {
        stockpile: {
          select: {
            id: true,
            name: true,
            hex: true,
            locationName: true,
          },
        },
        scannedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        scanItems: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.stockpileScan.count({
      where: whereClause,
    });

    // Group scans by stockpile for diff calculation
    const stockpileScans = new Map<string, typeof scans>();
    for (const scan of scans) {
      const existing = stockpileScans.get(scan.stockpileId) || [];
      existing.push(scan);
      stockpileScans.set(scan.stockpileId, existing);
    }

    // For each stockpile, fetch the previous scan if needed for diffs
    const previousScansNeeded = new Set<string>();
    for (const scan of scans) {
      // Check if we already have the previous scan in our results
      const stockpileHistory = stockpileScans.get(scan.stockpileId) || [];
      const scanIndex = stockpileHistory.findIndex(s => s.id === scan.id);
      if (scanIndex === stockpileHistory.length - 1) {
        // This is the oldest scan in our results, we need to fetch the previous one
        previousScansNeeded.add(scan.id);
      }
    }

    // Fetch previous scans for those that need it (only need scanItems for diff)
    type ScanItemsOnly = { scanItems: Array<{ itemCode: string; quantity: number; crated: boolean }> };
    const previousScansMap = new Map<string, ScanItemsOnly | null>();

    for (const scanId of previousScansNeeded) {
      const scan = scans.find(s => s.id === scanId);
      if (!scan) continue;

      const previousScan = await prisma.stockpileScan.findFirst({
        where: {
          stockpileId: scan.stockpileId,
          createdAt: { lt: scan.createdAt },
        },
        include: {
          scanItems: true,
        },
        orderBy: { createdAt: "desc" },
      });

      previousScansMap.set(scanId, previousScan);
    }

    // Calculate diffs for each scan
    const scansWithDiffs: ScanWithDiff[] = scans.map((scan) => {
      // Find the previous scan (either in our results or fetched separately)
      const stockpileHistory = stockpileScans.get(scan.stockpileId) || [];
      const scanIndex = stockpileHistory.findIndex(s => s.id === scan.id);

      let previousScan: ScanItemsOnly | null = null;
      if (scanIndex < stockpileHistory.length - 1) {
        // Previous scan is in our results
        previousScan = stockpileHistory[scanIndex + 1];
      } else {
        // Need to use the separately fetched previous scan
        previousScan = previousScansMap.get(scan.id) || null;
      }

      // Build item maps for comparison
      const currentItems = new Map<string, { quantity: number; crated: boolean }>();
      for (const item of scan.scanItems) {
        const key = `${item.itemCode}-${item.crated}`;
        currentItems.set(key, { quantity: item.quantity, crated: item.crated });
      }

      const previousItems = new Map<string, { quantity: number; crated: boolean }>();
      if (previousScan) {
        for (const item of previousScan.scanItems) {
          const key = `${item.itemCode}-${item.crated}`;
          previousItems.set(key, { quantity: item.quantity, crated: item.crated });
        }
      }

      // Calculate diffs
      const diffs: ItemDiff[] = [];
      const allKeys = new Set([...currentItems.keys(), ...previousItems.keys()]);

      for (const key of allKeys) {
        const current = currentItems.get(key);
        const previous = previousItems.get(key);

        const currentQty = current?.quantity || 0;
        const previousQty = previous?.quantity || 0;
        const change = currentQty - previousQty;

        // Only include items that changed
        if (change !== 0) {
          const [itemCode, cratedStr] = key.split("-");
          diffs.push({
            itemCode,
            displayName: getItemDisplayName(itemCode),
            previousQuantity: previousQty,
            currentQuantity: currentQty,
            change,
            crated: cratedStr === "true",
          });
        }
      }

      // Sort diffs: additions first (positive), then removals (negative)
      diffs.sort((a, b) => {
        if (a.change > 0 && b.change <= 0) return -1;
        if (a.change <= 0 && b.change > 0) return 1;
        return Math.abs(b.change) - Math.abs(a.change);
      });

      // Calculate totals
      let totalAdded = 0;
      let totalRemoved = 0;
      for (const diff of diffs) {
        if (diff.change > 0) {
          totalAdded += diff.change;
        } else {
          totalRemoved += Math.abs(diff.change);
        }
      }

      return {
        id: scan.id,
        stockpileId: scan.stockpileId,
        stockpileName: scan.stockpile.name,
        stockpileHex: scan.stockpile.hex,
        stockpileLocationName: scan.stockpile.locationName,
        scannedById: scan.scannedById,
        scannerName: scan.scannedBy.name,
        scannerImage: scan.scannedBy.image,
        itemCount: scan.itemCount,
        ocrConfidence: scan.ocrConfidence,
        createdAt: scan.createdAt.toISOString(),
        diffs,
        totalAdded,
        totalRemoved,
        netChange: totalAdded - totalRemoved,
      };
    });

    return NextResponse.json({
      scans: scansWithDiffs,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching scan history:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/history/[scanId]
 * Get full details of a specific scan
 */
