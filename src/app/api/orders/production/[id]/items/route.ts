import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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
});

/**
 * PUT /api/orders/production/[id]/items
 * Update item quantities for a production order
 * Also auto-updates order status based on progress
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        { error: "You don't have permission to update orders" },
        { status: 403 }
      );
    }

    // Verify order exists and isn't cancelled/completed
    const existing = await prisma.productionOrder.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
      },
      include: {
        items: true,
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

    const { items } = result.data;

    // Update items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Update each item
      for (const item of items) {
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
    });
  } catch (error) {
    console.error("Error updating production order items:", error);
    return NextResponse.json(
      { error: "Failed to update items" },
      { status: 500 }
    );
  }
}
