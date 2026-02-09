import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { nanoid } from "nanoid";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

// Schema for creating a production order
const createOrderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(3).default(0),
  items: z.array(
    z.object({
      itemCode: z.string().min(1),
      quantityRequired: z.number().int().positive(),
    })
  ).min(1, "At least one item is required"),
  // MPF fields
  isMpf: z.boolean().default(false),
  targetStockpileIds: z.array(z.string()).optional(),
});

/**
 * GET /api/orders/production
 * List all production orders for the current regiment
 */
export async function GET(request: NextRequest) {
  return withSpan("production_orders.list", async () => {
    try {
      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get("status");

      const where: Record<string, unknown> = {
        regimentId,
      };

      if (status && status !== "all") {
        where.status = status;
        addSpanAttributes({ "filter.status": status });
      }

      // Auto-update expired MPF timers before fetching
      await prisma.productionOrder.updateMany({
        where: {
          regimentId,
          isMpf: true,
          status: "IN_PROGRESS",
          mpfReadyAt: { lte: new Date() },
        },
        data: { status: "READY_FOR_PICKUP" },
      });

      const orders = await prisma.productionOrder.findMany({
        where,
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
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
      });

      addSpanAttributes({ "order.count": orders.length });

      // Calculate progress for each order
      const ordersWithProgress = orders.map((order) => {
        const totalRequired = order.items.reduce((sum, item) => sum + item.quantityRequired, 0);
        const totalProduced = order.items.reduce((sum, item) => sum + Math.min(item.quantityProduced, item.quantityRequired), 0);
        const itemsComplete = order.items.filter((item) => item.quantityProduced >= item.quantityRequired).length;

        return {
          ...order,
          progress: {
            totalRequired,
            totalProduced,
            percentage: totalRequired > 0 ? Math.round((totalProduced / totalRequired) * 100) : 0,
            itemsComplete,
            itemsTotal: order.items.length,
          },
        };
      });

      return NextResponse.json(ordersWithProgress);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch production orders" },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/orders/production
 * Create a new production order
 */
export async function POST(request: NextRequest) {
  return withSpan("production_orders.create", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.PRODUCTION_CREATE);
      if (authResult instanceof NextResponse) return authResult;
      const { userId, regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      const body = await request.json();
      const result = createOrderSchema.safeParse(body);

      if (!result.success) {
        const errors = result.error.flatten();
        return NextResponse.json(
          { error: "Invalid request", details: errors },
          { status: 400 }
        );
      }

      const { name, description, priority, items, isMpf, targetStockpileIds } = result.data;

      addSpanAttributes({
        "order.name": name,
        "order.priority": priority,
        "order.isMpf": isMpf,
        "item.count": items.length,
      });

      console.log("Creating order with:", {
        regimentId,
        name,
        priority,
        isMpf,
        createdById: userId,
        itemCount: items.length,
        targetStockpileCount: targetStockpileIds?.length || 0,
      });

      // Generate a unique short ID with retry on collision
      const generateShortId = async (): Promise<string> => {
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
          const shortId = nanoid(4);
          const existing = await prisma.productionOrder.findUnique({
            where: { shortId },
            select: { id: true },
          });
          if (!existing) return shortId;
        }
        // Fall back to longer ID if we hit unlikely collision streak
        return nanoid(8);
      };

      const shortId = await generateShortId();

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.productionOrder.create({
          data: {
            regimentId,
            shortId,
            name,
            description: description || null,
            priority,
            isMpf,
            createdById: userId,
          },
        });

        await tx.productionOrderItem.createMany({
          data: items.map((item) => ({
            orderId: newOrder.id,
            itemCode: item.itemCode,
            quantityRequired: item.quantityRequired,
            quantityProduced: 0,
          })),
        });

        // Create target stockpile associations
        if (targetStockpileIds && targetStockpileIds.length > 0) {
          await tx.productionOrderTargetStockpile.createMany({
            data: targetStockpileIds.map((stockpileId) => ({
              orderId: newOrder.id,
              stockpileId,
            })),
          });
        }

        return tx.productionOrder.findUnique({
          where: { id: newOrder.id },
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
          },
        });
      });

      addSpanAttributes({ "order.id": order?.id });

      return NextResponse.json(order, { status: 201 });
    } catch (error) {
      console.error("Error creating production order:", error);
      return NextResponse.json(
        {
          error: "Failed to create production order",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  });
}
