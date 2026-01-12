import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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

    // Get stockpile
    const stockpile = await prisma.stockpile.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
      },
      include: {
        items: {
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

    return NextResponse.json(stockpile);
  } catch (error) {
    console.error("Error fetching stockpile:", error);
    return NextResponse.json(
      { error: "Failed to fetch stockpile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stockpiles/[id]
 * Update a stockpile (including replacing items from a new scan)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check permissions
    const member = await prisma.regimentMember.findUnique({
      where: {
        userId_regimentId: {
          userId: session.user.id,
          regimentId: user.selectedRegimentId,
        },
      },
    });

    if (!member || member.permissionLevel === "VIEWER") {
      return NextResponse.json(
        { error: "You don't have permission to update stockpiles" },
        { status: 403 }
      );
    }

    // Verify stockpile exists and belongs to regiment
    const existing = await prisma.stockpile.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
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

        // Create a scan record to track who updated
        const avgConfidence = items.length > 0
          ? items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length
          : null;

        await tx.stockpileScan.create({
          data: {
            stockpileId: id,
            scannedById: session.user.id,
            itemCount: items.length,
            ocrConfidence: avgConfidence,
          },
        });
      }

      // Return updated stockpile
      return tx.stockpile.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: [{ crated: "desc" }, { quantity: "desc" }],
          },
        },
      });
    });

    return NextResponse.json(stockpile);
  } catch (error) {
    console.error("Error updating stockpile:", error);
    return NextResponse.json(
      { error: "Failed to update stockpile" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stockpiles/[id]
 * Delete a stockpile
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check permissions - only ADMIN can delete
    const member = await prisma.regimentMember.findUnique({
      where: {
        userId_regimentId: {
          userId: session.user.id,
          regimentId: user.selectedRegimentId,
        },
      },
    });

    if (!member || member.permissionLevel !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete stockpiles" },
        { status: 403 }
      );
    }

    // Verify stockpile exists and belongs to regiment
    const existing = await prisma.stockpile.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
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
}
