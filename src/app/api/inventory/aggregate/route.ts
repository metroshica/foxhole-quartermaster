import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemCodesByTag } from "@/lib/foxhole/item-tags";

/**
 * GET /api/inventory/aggregate
 *
 * Returns aggregated inventory across all stockpiles for the current regiment.
 * Sums quantities by itemCode and returns totals with display names.
 *
 * Query params:
 * - search: Filter items by name (fuzzy match on display name or item code)
 * - limit: Max items to return (default 50)
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get all stockpile items for this regiment
    const items = await prisma.stockpileItem.findMany({
      where: {
        stockpile: {
          regimentId: user.selectedRegimentId,
        },
      },
      select: {
        itemCode: true,
        quantity: true,
        crated: true,
        stockpileId: true,
      },
    });

    // Aggregate by itemCode
    const aggregateMap = new Map<string, {
      itemCode: string;
      displayName: string;
      totalQuantity: number;
      cratedQuantity: number;
      looseQuantity: number;
      stockpileIds: Set<string>;
    }>();

    for (const item of items) {
      const existing = aggregateMap.get(item.itemCode);
      const displayName = getItemDisplayName(item.itemCode);

      if (existing) {
        if (item.crated) {
          existing.cratedQuantity += item.quantity;
        } else {
          existing.looseQuantity += item.quantity;
        }
        existing.totalQuantity += item.quantity;
        existing.stockpileIds.add(item.stockpileId);
      } else {
        aggregateMap.set(item.itemCode, {
          itemCode: item.itemCode,
          displayName,
          totalQuantity: item.quantity,
          cratedQuantity: item.crated ? item.quantity : 0,
          looseQuantity: item.crated ? 0 : item.quantity,
          stockpileIds: new Set([item.stockpileId]),
        });
      }
    }

    // Convert to array and filter by search if provided
    let aggregated: {
      itemCode: string;
      displayName: string;
      totalQuantity: number;
      cratedQuantity: number;
      looseQuantity: number;
      stockpileCount: number;
      matchedTag: string | null;
    }[] = Array.from(aggregateMap.values()).map(item => ({
      itemCode: item.itemCode,
      displayName: item.displayName,
      totalQuantity: item.totalQuantity,
      cratedQuantity: item.cratedQuantity,
      looseQuantity: item.looseQuantity,
      stockpileCount: item.stockpileIds.size,
      matchedTag: null,
    }));

    // Filter by search term (including tag/abbreviation matching)
    if (search) {
      const tagMatchedCodes = new Set(getItemCodesByTag(search));

      aggregated = aggregated
        .filter(item =>
          item.displayName.toLowerCase().includes(search) ||
          item.itemCode.toLowerCase().includes(search) ||
          tagMatchedCodes.has(item.itemCode)
        )
        .map(item => ({
          ...item,
          matchedTag: tagMatchedCodes.has(item.itemCode) ? search.toUpperCase() : null,
        }));
    }

    // Sort by total quantity descending
    aggregated.sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Apply limit
    aggregated = aggregated.slice(0, limit);

    return NextResponse.json({
      items: aggregated,
      totalUniqueItems: aggregateMap.size,
    });
  } catch (error) {
    console.error("Error aggregating inventory:", error);
    return NextResponse.json(
      { error: "Failed to aggregate inventory" },
      { status: 500 }
    );
  }
}
