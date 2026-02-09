import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

// Schema for creating a stockpile with items from scanner
const createStockpileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["STORAGE_DEPOT", "SEAPORT"]),
  hex: z.string().min(1, "Hex is required"),
  locationName: z.string().min(1, "Location name is required"),
  code: z.string().optional(),
  items: z.array(
    z.object({
      code: z.string(),
      quantity: z.number().int().min(0),
      crated: z.boolean(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
});

/**
 * GET /api/stockpiles
 * List all stockpiles for the current regiment
 */
export async function GET(request: NextRequest) {
  return withSpan("stockpiles.list", async () => {
    try {
      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      // Get stockpiles for this regiment with most recent scan info
      const stockpiles = await prisma.stockpile.findMany({
        where: { regimentId },
        include: {
          items: {
            orderBy: { quantity: "desc" },
          },
          scans: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              scannedBy: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      addSpanAttributes({ "stockpile.count": stockpiles.length });

      // Transform to include lastScan and totalCrates
      const stockpilesWithLastScan = stockpiles.map((sp) => ({
        ...sp,
        lastScan: sp.scans[0] || null,
        scans: undefined, // Remove the scans array from response
        totalCrates: sp.items.reduce((sum, item) => sum + item.quantity, 0),
      }));

      // Sort by last scan time (most recent first), stockpiles without scans go last
      stockpilesWithLastScan.sort((a, b) => {
        const aTime = a.lastScan?.createdAt ? new Date(a.lastScan.createdAt).getTime() : 0;
        const bTime = b.lastScan?.createdAt ? new Date(b.lastScan.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      return NextResponse.json(stockpilesWithLastScan);
    } catch (error) {
      console.error("Error fetching stockpiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch stockpiles" },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/stockpiles
 * Create a new stockpile with items from scanner
 */
export async function POST(request: NextRequest) {
  return withSpan("stockpiles.create", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.STOCKPILE_CREATE);
      if (authResult instanceof NextResponse) return authResult;
      const { session, userId, regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      // Parse and validate request body
      const body = await request.json();
      const result = createStockpileSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { name, type, hex, locationName, code, items } = result.data;

      addSpanAttributes({
        "stockpile.name": name,
        "stockpile.type": type,
        "stockpile.hex": hex,
        "item.count": items.length,
      });

      // Get current war number for scan tracking
      let warNumber: number | null = null;
      try {
        const war = await getCurrentWar();
        warNumber = war.warNumber;
      } catch (error) {
        console.warn("Failed to get war number for scan tracking:", error);
      }

      // Create stockpile with items in a transaction
      const stockpile = await prisma.$transaction(async (tx) => {
        // Create the stockpile
        const newStockpile = await tx.stockpile.create({
          data: {
            regimentId,
            name,
            type,
            hex,
            locationName,
            code: code || null,
          },
        });

        // Create stockpile items
        if (items.length > 0) {
          await tx.stockpileItem.createMany({
            data: items.map((item) => ({
              stockpileId: newStockpile.id,
              itemCode: item.code,
              quantity: item.quantity,
              crated: item.crated,
              confidence: item.confidence || null,
            })),
          });
        }

        // Create initial scan record to track who created
        const avgConfidence = items.length > 0
          ? items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length
          : null;

        await tx.stockpileScan.create({
          data: {
            stockpileId: newStockpile.id,
            scannedById: userId,
            itemCount: items.length,
            ocrConfidence: avgConfidence,
            warNumber,
          },
        });

        // Return stockpile with items
        return tx.stockpile.findUnique({
          where: { id: newStockpile.id },
          include: {
            items: true,
          },
        });
      });

      addSpanAttributes({ "stockpile.id": stockpile?.id });

      return NextResponse.json(stockpile, { status: 201 });
    } catch (error) {
      console.error("Error creating stockpile:", error);

      // Handle unique constraint violation
      if ((error as any)?.code === "P2002") {
        return NextResponse.json(
          { error: "A stockpile with this name already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create stockpile" },
        { status: 500 }
      );
    }
  });
}
