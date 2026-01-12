import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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
      return NextResponse.json(
        { error: "No regiment selected" },
        { status: 400 }
      );
    }

    // Get stockpiles for this regiment with most recent scan info
    const stockpiles = await prisma.stockpile.findMany({
      where: { regimentId: user.selectedRegimentId },
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

    // Transform to include lastScan as a direct property
    const stockpilesWithLastScan = stockpiles.map((sp) => ({
      ...sp,
      lastScan: sp.scans[0] || null,
      scans: undefined, // Remove the scans array from response
    }));

    return NextResponse.json(stockpilesWithLastScan);
  } catch (error) {
    console.error("Error fetching stockpiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch stockpiles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stockpiles
 * Create a new stockpile with items from scanner
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's selected regiment and check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { selectedRegimentId: true },
    });

    if (!user?.selectedRegimentId) {
      return NextResponse.json(
        { error: "No regiment selected" },
        { status: 400 }
      );
    }

    // Check user has edit permission
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
        { error: "You don't have permission to create stockpiles" },
        { status: 403 }
      );
    }

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

    // Create stockpile with items in a transaction
    const stockpile = await prisma.$transaction(async (tx) => {
      // Create the stockpile
      const newStockpile = await tx.stockpile.create({
        data: {
          regimentId: user.selectedRegimentId!,
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
          scannedById: session.user.id,
          itemCount: items.length,
          ocrConfidence: avgConfidence,
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
}
