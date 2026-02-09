import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAuth, requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCurrentWar } from "@/lib/foxhole/war-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Compute fulfillment for a standing order by comparing required quantities
 * against actual stockpile inventory.
 */
async function computeFulfillment(orderId: string, stockpileId: string) {
  const orderItems = await prisma.productionOrderItem.findMany({
    where: { orderId },
  });

  const stockpileItems = await prisma.stockpileItem.findMany({
    where: {
      stockpileId,
      crated: true,
    },
  });

  const stockpileMap = new Map(
    stockpileItems.map((si) => [si.itemCode, si.quantity])
  );

  const items = orderItems.map((oi) => {
    const current = stockpileMap.get(oi.itemCode) || 0;
    return {
      itemCode: oi.itemCode,
      required: oi.quantityRequired,
      current,
      fulfilled: current >= oi.quantityRequired,
      deficit: Math.max(0, oi.quantityRequired - current),
    };
  });

  const allFulfilled = items.length > 0 && items.every((i) => i.fulfilled);
  const totalRequired = items.reduce((s, i) => s + i.required, 0);
  const totalCurrent = items.reduce(
    (s, i) => s + Math.min(i.current, i.required),
    0
  );
  const percentage =
    totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;

  return { items, allFulfilled, percentage };
}

/**
 * GET /api/stockpiles/[id]/minimums
 * Returns the linked standing order with fulfillment status.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const { id } = await context.params;

    // Verify stockpile belongs to regiment
    const stockpile = await prisma.stockpile.findFirst({
      where: { id, regimentId },
      select: { id: true, name: true, hex: true },
    });

    if (!stockpile) {
      return NextResponse.json(
        { error: "Stockpile not found" },
        { status: 404 }
      );
    }

    // Find standing order linked to this stockpile
    const standingOrder = await prisma.productionOrder.findFirst({
      where: {
        linkedStockpileId: id,
        isStandingOrder: true,
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!standingOrder) {
      return NextResponse.json({
        stockpileId: id,
        standingOrder: null,
        fulfillment: null,
      });
    }

    const fulfillment = await computeFulfillment(standingOrder.id, id);

    // Update status based on fulfillment
    if (fulfillment.allFulfilled && standingOrder.status !== "FULFILLED") {
      await prisma.productionOrder.update({
        where: { id: standingOrder.id },
        data: { status: "FULFILLED" },
      });
      standingOrder.status = "FULFILLED";
    } else if (
      !fulfillment.allFulfilled &&
      standingOrder.status === "FULFILLED"
    ) {
      await prisma.productionOrder.update({
        where: { id: standingOrder.id },
        data: { status: "IN_PROGRESS" },
      });
      standingOrder.status = "IN_PROGRESS";
    }

    return NextResponse.json({
      stockpileId: id,
      standingOrder: {
        id: standingOrder.id,
        name: standingOrder.name,
        status: standingOrder.status,
        items: standingOrder.items,
        createdBy: standingOrder.createdBy,
      },
      fulfillment,
    });
  } catch (error) {
    console.error("Error fetching stockpile minimums:", error);
    return NextResponse.json(
      { error: "Failed to fetch stockpile minimums" },
      { status: 500 }
    );
  }
}

const minimumsSchema = z.object({
  items: z.array(
    z.object({
      itemCode: z.string().min(1),
      minimumQuantity: z.number().int().positive(),
    })
  ),
});

/**
 * PUT /api/stockpiles/[id]/minimums
 * Create or update the standing order for this stockpile's minimum levels.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requirePermission(
      PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS
    );
    if (authResult instanceof NextResponse) return authResult;
    const { userId, regimentId } = authResult;

    const { id } = await context.params;

    // Verify stockpile belongs to regiment
    const stockpile = await prisma.stockpile.findFirst({
      where: { id, regimentId },
      select: { id: true, name: true, hex: true },
    });

    if (!stockpile) {
      return NextResponse.json(
        { error: "Stockpile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = minimumsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = result.data;

    // Find existing standing order
    const existingOrder = await prisma.productionOrder.findFirst({
      where: {
        linkedStockpileId: id,
        isStandingOrder: true,
      },
    });

    // If items array is empty, delete the standing order
    if (items.length === 0) {
      if (existingOrder) {
        await prisma.productionOrder.delete({
          where: { id: existingOrder.id },
        });
      }
      return NextResponse.json({
        stockpileId: id,
        standingOrder: null,
        fulfillment: null,
      });
    }

    // Get current war number
    let warNumber: number | null = null;
    try {
      const war = await getCurrentWar();
      warNumber = war.warNumber;
    } catch {
      // War API down
    }

    let orderId: string;

    if (existingOrder) {
      // Update existing: delete old items, create new ones
      await prisma.$transaction(async (tx) => {
        await tx.productionOrderItem.deleteMany({
          where: { orderId: existingOrder.id },
        });

        await tx.productionOrderItem.createMany({
          data: items.map((item) => ({
            orderId: existingOrder.id,
            itemCode: item.itemCode,
            quantityRequired: item.minimumQuantity,
            quantityProduced: 0,
          })),
        });

        // Update name in case stockpile was renamed
        await tx.productionOrder.update({
          where: { id: existingOrder.id },
          data: {
            name: `Minimum Stock: ${stockpile.hex} - ${stockpile.name}`,
            status: "PENDING", // Will be recomputed on next read
          },
        });
      });
      orderId = existingOrder.id;
    } else {
      // Create new standing order
      const shortId = nanoid(4);
      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.productionOrder.create({
          data: {
            regimentId,
            shortId,
            name: `Minimum Stock: ${stockpile.hex} - ${stockpile.name}`,
            description: `Automatically tracks minimum inventory levels for ${stockpile.name}`,
            isStandingOrder: true,
            linkedStockpileId: id,
            warNumber,
            createdById: userId,
            status: "PENDING",
          },
        });

        await tx.productionOrderItem.createMany({
          data: items.map((item) => ({
            orderId: order.id,
            itemCode: item.itemCode,
            quantityRequired: item.minimumQuantity,
            quantityProduced: 0,
          })),
        });

        // Link this stockpile as a target too
        await tx.productionOrderTargetStockpile.create({
          data: {
            orderId: order.id,
            stockpileId: id,
          },
        });

        return order;
      });
      orderId = newOrder.id;
    }

    // Fetch the updated order and compute fulfillment
    const standingOrder = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!standingOrder) {
      return NextResponse.json(
        { error: "Failed to retrieve standing order" },
        { status: 500 }
      );
    }

    const fulfillment = await computeFulfillment(orderId, id);

    // Update status based on fulfillment
    if (fulfillment.allFulfilled) {
      await prisma.productionOrder.update({
        where: { id: orderId },
        data: { status: "FULFILLED" },
      });
      standingOrder.status = "FULFILLED";
    } else {
      await prisma.productionOrder.update({
        where: { id: orderId },
        data: { status: "IN_PROGRESS" },
      });
      standingOrder.status = "IN_PROGRESS";
    }

    return NextResponse.json({
      stockpileId: id,
      standingOrder: {
        id: standingOrder.id,
        name: standingOrder.name,
        status: standingOrder.status,
        items: standingOrder.items,
        createdBy: standingOrder.createdBy,
      },
      fulfillment,
    });
  } catch (error) {
    console.error("Error updating stockpile minimums:", error);
    return NextResponse.json(
      { error: "Failed to update stockpile minimums" },
      { status: 500 }
    );
  }
}
