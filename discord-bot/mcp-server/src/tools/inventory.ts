import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { getItemDisplayName, getItemCodesByTag, isVehicle } from "../utils/items.js";

export function registerInventoryTools(server: McpServer): void {
  // search_inventory - Search regiment inventory
  server.tool(
    "search_inventory",
    "Search regiment inventory for items by name, code, or slang (e.g., '12.7', 'mammon', 'bmat')",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      query: z.string().optional().describe("Search term (item name, code, or slang)"),
      category: z.enum(["vehicles", "weapons", "ammo", "resources", "all"]).optional().describe("Filter by category"),
      limit: z.number().optional().default(20).describe("Max items to return"),
    },
    async ({ regimentId, query, category, limit }) => {
      // Get all stockpile items for this regiment
      const items = await prisma.stockpileItem.findMany({
        where: {
          stockpile: { regimentId },
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

      // Convert to array
      let aggregated = Array.from(aggregateMap.values()).map(item => ({
        itemCode: item.itemCode,
        displayName: item.displayName,
        totalQuantity: item.totalQuantity,
        cratedQuantity: item.cratedQuantity,
        looseQuantity: item.looseQuantity,
        stockpileCount: item.stockpileIds.size,
        matchedTag: null as string | null,
      }));

      // Filter by category
      if (category === "vehicles") {
        aggregated = aggregated.filter(item => isVehicle(item.itemCode));
      }

      // Filter by search term
      if (query) {
        const searchLower = query.toLowerCase();
        const tagMatchedCodes = new Set(getItemCodesByTag(searchLower));

        aggregated = aggregated
          .filter(item =>
            item.displayName.toLowerCase().includes(searchLower) ||
            item.itemCode.toLowerCase().includes(searchLower) ||
            tagMatchedCodes.has(item.itemCode)
          )
          .map(item => ({
            ...item,
            matchedTag: tagMatchedCodes.has(item.itemCode) ? query.toUpperCase() : null,
          }));
      }

      // Sort by total quantity descending
      aggregated.sort((a, b) => b.totalQuantity - a.totalQuantity);

      // Apply limit
      aggregated = aggregated.slice(0, limit);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              query: query || null,
              category: category || "all",
              resultCount: aggregated.length,
              totalUniqueItems: aggregateMap.size,
              items: aggregated,
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_item_locations - Find where specific item is stored
  server.tool(
    "get_item_locations",
    "Get list of stockpiles containing a specific item with quantities",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      itemCode: z.string().describe("Item code to search for (e.g., 'RifleC', 'HEGrenade')"),
    },
    async ({ regimentId, itemCode }) => {
      // Get all stockpiles that have this item
      const stockpileItems = await prisma.stockpileItem.findMany({
        where: {
          itemCode,
          stockpile: { regimentId },
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
        orderBy: { quantity: "desc" },
      });

      // Group by stockpile (separate entries for crated/loose)
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

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              itemCode,
              displayName: getItemDisplayName(itemCode),
              totalQuantity,
              totalCrated,
              totalLoose,
              stockpileCount: stockpiles.length,
              stockpiles: stockpiles.map(s => ({
                ...s,
                location: `${s.hex} - ${s.locationName}`,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );
}
