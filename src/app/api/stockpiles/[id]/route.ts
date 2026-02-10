import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission, hasPermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notifyActivity } from "@/lib/discord/activity-notifications";

// Schema for updating stockpile items from scanner
const updateStockpileSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["STORAGE_DEPOT", "SEAPORT"]).optional(),
  hex: z.string().min(1).optional(),
  locationName: z.string().min(1).optional(),
  code: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        code: z.string(),
        quantity: z.number().int().min(0),
        crated: z.boolean(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/stockpiles/[id]
 * Get a specific stockpile with all items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withSpan("stockpiles.get", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "stockpile.id": id });

      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { session, regimentId } = authResult;

      if (!hasPermission(session, PERMISSIONS.STOCKPILE_VIEW)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Get stockpile
      const stockpile = await prisma.stockpile.findFirst({
        where: {
          id,
          regimentId,
        },
        include: {
          items: {
            where: { quantity: { gt: 0 } },
            orderBy: [{ crated: "desc" }, { quantity: "desc" }],
          },
        },
      });

      if (!stockpile) {
        return NextResponse.json(
          { error: "Stockpile not found" },
          { status: 404 }
        );
      }

      addSpanAttributes({ "item.count": stockpile.items.length });

      return NextResponse.json(stockpile);
    } catch (error) {
      console.error("Error fetching stockpile:", error);
      return NextResponse.json(
        { error: "Failed to fetch stockpile" },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/stockpiles/[id]
 * Update a stockpile (including replacing items from a new scan)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withSpan("stockpiles.update", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "stockpile.id": id });

      const authResult = await requirePermission(PERMISSIONS.STOCKPILE_UPDATE);
      if (authResult instanceof NextResponse) return authResult;
      const { userId, regimentId } = authResult;

      // Verify stockpile exists and belongs to regiment
      const existing = await prisma.stockpile.findFirst({
        where: {
          id,
          regimentId,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Stockpile not found" },
          { status: 404 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const result = updateStockpileSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { name, type, hex, locationName, code, items } = result.data;

      if (items !== undefined) {
        addSpanAttributes({ "item.count": items.length });
      }

      // Get current war number for scan tracking
      let warNumber: number | null = null;
      try {
        const war = await getCurrentWar();
        warNumber = war.warNumber;
      } catch (error) {
        console.warn("Failed to get war number for scan tracking:", error);
      }

      // Update stockpile in a transaction
      const stockpile = await prisma.$transaction(async (tx) => {
        // Update stockpile metadata - always touch updatedAt to reflect the scan time
        await tx.stockpile.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(type !== undefined && { type }),
            ...(hex !== undefined && { hex }),
            ...(locationName !== undefined && { locationName }),
            ...(code !== undefined && { code }),
            updatedAt: new Date(), // Always update timestamp on any update
          },
        });

        // If items provided, replace all existing items and create a scan record
        if (items !== undefined) {
          // Delete existing items
          await tx.stockpileItem.deleteMany({
            where: { stockpileId: id },
          });

          // Create new items
          if (items.length > 0) {
            await tx.stockpileItem.createMany({
              data: items.map((item) => ({
                stockpileId: id,
                itemCode: item.code,
                quantity: item.quantity,
                crated: item.crated,
                confidence: item.confidence || null,
              })),
            });
          }

          // Create a scan record to track who updated and store item snapshot
          const avgConfidence = items.length > 0
            ? items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length
            : null;

          const scan = await tx.stockpileScan.create({
            data: {
              stockpileId: id,
              scannedById: userId,
              itemCount: items.length,
              ocrConfidence: avgConfidence,
              warNumber,
            },
          });

          // Store the scan items for history/audit purposes
          if (items.length > 0) {
            await tx.stockpileScanItem.createMany({
              data: items.map((item) => ({
                scanId: scan.id,
                itemCode: item.code,
                quantity: item.quantity,
                crated: item.crated,
                confidence: item.confidence || null,
              })),
            });
          }
        }

        // Return updated stockpile
        return tx.stockpile.findUnique({
          where: { id },
          include: {
            items: {
              where: { quantity: { gt: 0 } },
              orderBy: [{ crated: "desc" }, { quantity: "desc" }],
            },
          },
        });
      });

      // Fire-and-forget activity notification for scans
      if (items !== undefined && items.length > 0) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        notifyActivity(regimentId, {
          type: "SCAN",
          userName: user?.name || "Unknown",
          stockpileName: existing.name,
          hex: existing.hex,
          itemCount: items.length,
        });
      }

      return NextResponse.json(stockpile);
    } catch (error) {
      console.error("Error updating stockpile:", error);
      return NextResponse.json(
        { error: "Failed to update stockpile", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/stockpiles/[id]
 * Delete a stockpile
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withSpan("stockpiles.delete", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "stockpile.id": id });

      const authResult = await requirePermission(PERMISSIONS.STOCKPILE_DELETE);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      // Verify stockpile exists and belongs to regiment
      const existing = await prisma.stockpile.findFirst({
        where: {
          id,
          regimentId,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Stockpile not found" },
          { status: 404 }
        );
      }

      // Delete stockpile (items cascade automatically)
      await prisma.stockpile.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting stockpile:", error);
      return NextResponse.json(
        { error: "Failed to delete stockpile" },
        { status: 500 }
      );
    }
  });
}
