import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * GET /api/inventory/item/[itemCode]
 *
 * Returns which stockpiles have a specific item and their quantities.
 * Used for drill-down from aggregate inventory view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemCode: string }> }
) {
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

    if (!session.user.permissions?.includes(PERMISSIONS.STOCKPILE_VIEW)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { itemCode } = await params;

    // Get all stockpiles that have this item
    const stockpileItems = await prisma.stockpileItem.findMany({
      where: {
        itemCode,
        stockpile: {
          regimentId: user.selectedRegimentId,
        },
      },
      include: {
        stockpile: {
          select: {
            id: true,
            name: true,
            type: true,
            hex: true,
            locationName: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        quantity: "desc",
      },
    });

    // Group by stockpile (since we have separate entries for crated/loose)
    const stockpileMap = new Map<string, {
      id: string;
      name: string;
      type: string;
      hex: string;
      locationName: string;
      updatedAt: Date;
      looseQuantity: number;
      cratedQuantity: number;
      totalQuantity: number;
    }>();

    for (const item of stockpileItems) {
      const existing = stockpileMap.get(item.stockpile.id);

      if (existing) {
        if (item.crated) {
          existing.cratedQuantity += item.quantity;
        } else {
          existing.looseQuantity += item.quantity;
        }
        existing.totalQuantity += item.quantity;
      } else {
        stockpileMap.set(item.stockpile.id, {
          id: item.stockpile.id,
          name: item.stockpile.name,
          type: item.stockpile.type,
          hex: item.stockpile.hex,
          locationName: item.stockpile.locationName,
          updatedAt: item.stockpile.updatedAt,
          looseQuantity: item.crated ? 0 : item.quantity,
          cratedQuantity: item.crated ? item.quantity : 0,
          totalQuantity: item.quantity,
        });
      }
    }

    const stockpiles = Array.from(stockpileMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    // Calculate totals
    const totalQuantity = stockpiles.reduce((sum, s) => sum + s.totalQuantity, 0);
    const totalCrated = stockpiles.reduce((sum, s) => sum + s.cratedQuantity, 0);
    const totalLoose = stockpiles.reduce((sum, s) => sum + s.looseQuantity, 0);

    return NextResponse.json({
      itemCode,
      displayName: getItemDisplayName(itemCode),
      totalQuantity,
      totalCrated,
      totalLoose,
      stockpileCount: stockpiles.length,
      stockpiles,
    });
  } catch (error) {
    console.error("Error fetching item locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch item locations" },
      { status: 500 }
    );
  }
}
