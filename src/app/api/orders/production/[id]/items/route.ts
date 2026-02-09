import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getCurrentWar } from "@/lib/foxhole/war-api";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateItemsSchema = z.object({
  items: z.array(
    z.object({
      itemCode: z.string().min(1),
      quantityProduced: z.number().int().min(0),
    })
  ).min(1),
  targetStockpileId: z.string().optional(), // Stockpile to increment inventory
});

/**
 * PUT /api/orders/production/[id]/items
 * Update item quantities for a production order
 * Also auto-updates order status based on progress
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withSpan("production_orders.update_items", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "order.id": id });

      const authResult = await requirePermission(PERMISSIONS.PRODUCTION_UPDATE_ITEMS);
      if (authResult instanceof NextResponse) return authResult;
      const { userId, regimentId } = authResult;

      // Verify order exists and isn't cancelled/completed
      const existing = await prisma.productionOrder.findFirst({
        where: {
          id,
          regimentId,
        },
        include: {
          items: true,
          targetStockpiles: {
            include: {
              stockpile: {
                select: {
                  id: true,
                  name: true,
                  hex: true,
                },
              },
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (existing.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot update items on a cancelled order" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const result = updateItemsSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { items, targetStockpileId: providedStockpileId } = result.data;
      addSpanAttributes({ "items.updated": items.length });

      // Determine which stockpile to update (if any)
      const targetStockpiles = existing.targetStockpiles;
      let effectiveStockpileId: string | null = null;
      let effectiveStockpileName: string | null = null;

      if (providedStockpileId) {
        // Verify provided stockpile is one of the order's targets
        const targetStockpile = targetStockpiles.find(
          (ts) => ts.stockpileId === providedStockpileId
        );
        if (!targetStockpile) {
          return NextResponse.json(
            { error: "Provided stockpile is not a target for this order" },
            { status: 400 }
          );
        }
        effectiveStockpileId = providedStockpileId;
        effectiveStockpileName = `${targetStockpile.stockpile.hex} - ${targetStockpile.stockpile.name}`;
      } else if (targetStockpiles.length === 1) {
        // Auto-select single target stockpile
        effectiveStockpileId = targetStockpiles[0].stockpileId;
        effectiveStockpileName = `${targetStockpiles[0].stockpile.hex} - ${targetStockpiles[0].stockpile.name}`;
      } else if (targetStockpiles.length > 1) {
        // Multiple targets - require selection
        return NextResponse.json(
          {
            error: "Multiple target stockpiles - selection required",
            targetStockpiles: targetStockpiles.map((ts) => ({
              id: ts.stockpileId,
              name: ts.stockpile.name,
              hex: ts.stockpile.hex,
            })),
          },
          { status: 400 }
        );
      }
      // If no target stockpiles, effectiveStockpileId remains null and we skip stockpile update

      // Get current war number for contribution tracking
      let warNumber = 0;
      try {
        const war = await getCurrentWar();
        warNumber = war.warNumber;
      } catch (error) {
        console.warn("Failed to get war number for contribution tracking:", error);
      }

      // Track stockpile updates for response
      let stockpileItemsUpdated = 0;

      // Update items in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Get current quantities to calculate deltas
        const currentItems = await tx.productionOrderItem.findMany({
          where: { orderId: id },
        });
        const currentQuantities = new Map(
          currentItems.map((item) => [item.itemCode, item.quantityProduced])
        );

        // Update each item and track contributions
        const contributions: { itemCode: string; quantity: number }[] = [];

        for (const item of items) {
          const oldQuantity = currentQuantities.get(item.itemCode) || 0;
          const delta = item.quantityProduced - oldQuantity;

          // Only track positive deltas as contributions
          if (delta > 0) {
            contributions.push({ itemCode: item.itemCode, quantity: delta });
          }

          await tx.productionOrderItem.updateMany({
            where: {
              orderId: id,
              itemCode: item.itemCode,
            },
            data: {
              quantityProduced: item.quantityProduced,
            },
          });
        }

        // Create contribution records for leaderboard
        if (contributions.length > 0 && warNumber > 0) {
          await tx.productionContribution.createMany({
            data: contributions.map((c) => ({
              orderId: id,
              itemCode: c.itemCode,
              userId,
              quantity: c.quantity,
              warNumber,
            })),
          });
        }

        // Increment stockpile inventory for positive deltas
        if (effectiveStockpileId && contributions.length > 0) {
          for (const contribution of contributions) {
            // Upsert stockpile item - increment if exists, create if not
            // Production creates crated items
            await tx.stockpileItem.upsert({
              where: {
                stockpileId_itemCode_crated: {
                  stockpileId: effectiveStockpileId,
                  itemCode: contribution.itemCode,
                  crated: true,
                },
              },
              update: {
                quantity: { increment: contribution.quantity },
              },
              create: {
                stockpileId: effectiveStockpileId,
                itemCode: contribution.itemCode,
                quantity: contribution.quantity,
                crated: true,
              },
            });
            stockpileItemsUpdated += contribution.quantity;
          }
        }

        // Get updated items to calculate new status
        const updatedItems = await tx.productionOrderItem.findMany({
          where: { orderId: id },
        });

        // Calculate new status
        const hasAnyProgress = updatedItems.some((item) => item.quantityProduced > 0);
        const allComplete = updatedItems.every((item) => item.quantityProduced >= item.quantityRequired);

        let newStatus = existing.status;
        let completedAt = existing.completedAt;

        if (allComplete) {
          newStatus = "COMPLETED";
          completedAt = completedAt || new Date();
        } else if (hasAnyProgress) {
          newStatus = "IN_PROGRESS";
          completedAt = null;
        } else {
          newStatus = "PENDING";
          completedAt = null;
        }

        // Update order status if changed
        if (newStatus !== existing.status) {
          await tx.productionOrder.update({
            where: { id },
            data: {
              status: newStatus,
              completedAt,
            },
          });
        }

        // Return updated order
        return tx.productionOrder.findUnique({
          where: { id },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            items: {
              orderBy: { itemCode: "asc" },
            },
            targetStockpiles: {
              include: {
                stockpile: {
                  select: {
                    id: true,
                    name: true,
                    hex: true,
                    locationName: true,
                  },
                },
              },
            },
            deliveryStockpile: {
              select: {
                id: true,
                name: true,
                hex: true,
                locationName: true,
              },
            },
          },
        });
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Calculate progress
      const totalRequired = order.items.reduce((sum, item) => sum + item.quantityRequired, 0);
      const totalProduced = order.items.reduce((sum, item) => sum + Math.min(item.quantityProduced, item.quantityRequired), 0);
      const itemsComplete = order.items.filter((item) => item.quantityProduced >= item.quantityRequired).length;

      return NextResponse.json({
        ...order,
        progress: {
          totalRequired,
          totalProduced,
          percentage: totalRequired > 0 ? Math.round((totalProduced / totalRequired) * 100) : 0,
          itemsComplete,
          itemsTotal: order.items.length,
        },
        stockpileUpdated: effectiveStockpileId && stockpileItemsUpdated > 0
          ? {
              stockpileId: effectiveStockpileId,
              stockpileName: effectiveStockpileName,
              itemsUpdated: stockpileItemsUpdated,
            }
          : null,
      });
    } catch (error) {
      console.error("Error updating production order items:", error);
      return NextResponse.json(
        { error: "Failed to update items" },
        { status: 500 }
      );
    }
  });
}
