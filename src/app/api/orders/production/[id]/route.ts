import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateOrderSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"]).optional(),
  // MPF fields
  mpfDurationSeconds: z.number().int().positive().optional(), // For submitting to MPF
  deliveryStockpileId: z.string().optional(), // For completing MPF orders
  resetMpfTimer: z.boolean().optional(), // For admin reset of MPF timer
  // Full edit fields (admin)
  items: z.array(z.object({
    itemCode: z.string(),
    quantityRequired: z.number().int().positive(),
    quantityProduced: z.number().int().min(0).optional(),
  })).optional(),
  targetStockpileIds: z.array(z.string()).optional(),
});

/**
 * GET /api/orders/production/[id]
 * Get a specific production order with items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withSpan("production_orders.get", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "order.id": id });

      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      // Auto-update expired MPF timer
      await prisma.productionOrder.updateMany({
        where: {
          id,
          regimentId,
          isMpf: true,
          status: "IN_PROGRESS",
          mpfReadyAt: { lte: new Date() },
        },
        data: { status: "READY_FOR_PICKUP" },
      });

      const order = await prisma.productionOrder.findFirst({
        where: {
          id,
          regimentId,
        },
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

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      addSpanAttributes({ "item.count": order.items.length });

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
      });
    } catch (error) {
      console.error("Error fetching production order:", error);
      return NextResponse.json(
        { error: "Failed to fetch production order" },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/orders/production/[id]
 * Update a production order
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withSpan("production_orders.update", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "order.id": id });

      const authResult = await requirePermission(PERMISSIONS.PRODUCTION_UPDATE);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      // Verify order exists
      const existing = await prisma.productionOrder.findFirst({
        where: {
          id,
          regimentId,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const body = await request.json();
      const result = updateOrderSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { name, description, priority, status, mpfDurationSeconds, deliveryStockpileId, resetMpfTimer, items, targetStockpileIds } = result.data;

      // Calculate MPF ready time if submitting to MPF (first submission or admin reset)
      let mpfSubmittedAt: Date | undefined;
      let mpfReadyAt: Date | undefined;

      if (mpfDurationSeconds && existing.isMpf) {
        // First submission (from PENDING)
        if (existing.status === "PENDING") {
          mpfSubmittedAt = new Date();
          mpfReadyAt = new Date(mpfSubmittedAt.getTime() + mpfDurationSeconds * 1000);
        }
        // Admin timer reset
        else if (resetMpfTimer) {
          mpfSubmittedAt = new Date();
          mpfReadyAt = new Date(mpfSubmittedAt.getTime() + mpfDurationSeconds * 1000);
        }
      }

      // Validate MPF order completion requires delivery stockpile
      if (status === "COMPLETED" && existing.isMpf && !deliveryStockpileId && !existing.deliveryStockpileId) {
        return NextResponse.json(
          { error: "Delivery stockpile required for MPF order completion" },
          { status: 400 }
        );
      }

      // Use transaction for updating items and target stockpiles
      const order = await prisma.$transaction(async (tx) => {
        // Update items if provided
        if (items !== undefined) {
          // Delete existing items
          await tx.productionOrderItem.deleteMany({
            where: { orderId: id },
          });

          // Create new items
          if (items.length > 0) {
            await tx.productionOrderItem.createMany({
              data: items.map((item) => ({
                orderId: id,
                itemCode: item.itemCode,
                quantityRequired: item.quantityRequired,
                quantityProduced: item.quantityProduced ?? 0,
              })),
            });
          }
        }

        // Update target stockpiles if provided
        if (targetStockpileIds !== undefined) {
          // Delete existing target stockpiles
          await tx.productionOrderTargetStockpile.deleteMany({
            where: { orderId: id },
          });

          // Create new target stockpiles
          if (targetStockpileIds.length > 0) {
            await tx.productionOrderTargetStockpile.createMany({
              data: targetStockpileIds.map((stockpileId) => ({
                orderId: id,
                stockpileId,
              })),
            });
          }
        }

        // Update the order
        return tx.productionOrder.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(priority !== undefined && { priority }),
            ...(status !== undefined && { status }),
            // MPF submission/reset
            ...(mpfSubmittedAt && { mpfSubmittedAt }),
            ...(mpfReadyAt && { mpfReadyAt, status: resetMpfTimer ? status || "IN_PROGRESS" : "IN_PROGRESS" }),
            // Delivery
            ...(deliveryStockpileId !== undefined && { deliveryStockpileId }),
            ...(status === "COMPLETED" && !existing.completedAt && { completedAt: new Date(), deliveredAt: new Date() }),
            ...(status !== "COMPLETED" && existing.completedAt && { completedAt: null, deliveredAt: null }),
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            items: true,
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

      return NextResponse.json(order);
    } catch (error) {
      console.error("Error updating production order:", error);
      return NextResponse.json(
        { error: "Failed to update production order" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/orders/production/[id]
 * Delete a production order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withSpan("production_orders.delete", async () => {
    try {
      const { id } = await params;
      addSpanAttributes({ "order.id": id });

      const authResult = await requirePermission(PERMISSIONS.PRODUCTION_DELETE);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      // Verify order exists
      const existing = await prisma.productionOrder.findFirst({
        where: {
          id,
          regimentId,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      await prisma.productionOrder.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting production order:", error);
      return NextResponse.json(
        { error: "Failed to delete production order" },
        { status: 500 }
      );
    }
  });
}
