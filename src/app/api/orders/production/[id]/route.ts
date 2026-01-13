import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateOrderSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

/**
 * GET /api/orders/production/[id]
 * Get a specific production order with items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const order = await prisma.productionOrder.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
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
      },
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
    console.error("Error fetching production order:", error);
    return NextResponse.json(
      { error: "Failed to fetch production order" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/production/[id]
 * Update a production order
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

    // Verify order exists
    const existing = await prisma.productionOrder.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
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

    const { name, description, priority, status } = result.data;

    const order = await prisma.productionOrder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(status === "COMPLETED" && !existing.completedAt && { completedAt: new Date() }),
        ...(status !== "COMPLETED" && existing.completedAt && { completedAt: null }),
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
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating production order:", error);
    return NextResponse.json(
      { error: "Failed to update production order" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/production/[id]
 * Delete a production order (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check permissions - admin only
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
        { error: "Only admins can delete orders" },
        { status: 403 }
      );
    }

    // Verify order exists
    const existing = await prisma.productionOrder.findFirst({
      where: {
        id,
        regimentId: user.selectedRegimentId,
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
}
