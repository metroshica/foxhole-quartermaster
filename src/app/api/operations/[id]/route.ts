import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

// Schema for updating an operation
const updateOperationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  scheduledEndAt: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  destinationStockpileId: z.string().optional().nullable(),
  requirements: z.array(
    z.object({
      itemCode: z.string().min(1),
      quantity: z.number().int().positive(),
      priority: z.number().int().min(0).max(3).default(0),
    })
  ).optional(),
});

/**
 * GET /api/operations/[id]
 *
 * Get operation details with calculated deficit.
 * Compares requirements against available inventory across all stockpiles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Get operation with requirements
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        destinationStockpile: {
          select: {
            id: true,
            name: true,
            type: true,
            hex: true,
            locationName: true,
          },
        },
        requirements: true,
      },
    });

    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    // Verify operation belongs to user's regiment
    if (operation.regimentId !== user.selectedRegimentId) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    // Get aggregate inventory for required items
    const itemCodes = operation.requirements.map(r => r.itemCode);

    const inventoryItems = await prisma.stockpileItem.groupBy({
      by: ["itemCode"],
      where: {
        itemCode: { in: itemCodes },
        stockpile: {
          regimentId: user.selectedRegimentId,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // Create inventory map
    const inventoryMap = new Map<string, number>();
    for (const item of inventoryItems) {
      inventoryMap.set(item.itemCode, item._sum.quantity || 0);
    }

    // Calculate requirements with deficit
    const requirementsWithDeficit = operation.requirements.map(req => {
      const available = inventoryMap.get(req.itemCode) || 0;
      const deficit = Math.max(0, req.quantity - available);

      return {
        id: req.id,
        itemCode: req.itemCode,
        displayName: getItemDisplayName(req.itemCode),
        required: req.quantity,
        available,
        deficit,
        priority: req.priority,
        fulfilled: deficit === 0,
      };
    });

    // Sort by priority (high to low), then by deficit (high to low)
    requirementsWithDeficit.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.deficit - a.deficit;
    });

    // Calculate totals
    const totalRequired = requirementsWithDeficit.reduce((sum, r) => sum + r.required, 0);
    const totalAvailable = requirementsWithDeficit.reduce((sum, r) => sum + Math.min(r.available, r.required), 0);
    const totalDeficit = requirementsWithDeficit.reduce((sum, r) => sum + r.deficit, 0);
    const itemsWithDeficit = requirementsWithDeficit.filter(r => r.deficit > 0).length;

    return NextResponse.json({
      ...operation,
      requirements: requirementsWithDeficit,
      summary: {
        totalRequired,
        totalAvailable,
        totalDeficit,
        itemsWithDeficit,
        totalItems: requirementsWithDeficit.length,
        fulfillmentPercent: totalRequired > 0
          ? Math.round((totalAvailable / totalRequired) * 100)
          : 100,
      },
    });
  } catch (error) {
    console.error("Error fetching operation:", error);
    return NextResponse.json(
      { error: "Failed to fetch operation" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/operations/[id]
 *
 * Update an operation and its requirements.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "You don't have permission to update operations" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify operation exists and belongs to regiment
    const existingOperation = await prisma.operation.findUnique({
      where: { id },
    });

    if (!existingOperation || existingOperation.regimentId !== user.selectedRegimentId) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateOperationSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      const errorMessages = [
        ...Object.entries(errors.fieldErrors).map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`),
        ...errors.formErrors,
      ].filter(Boolean);
      return NextResponse.json(
        { error: errorMessages.join("; ") || "Invalid request", details: errors },
        { status: 400 }
      );
    }

    const { name, description, status, scheduledFor, scheduledEndAt, location, destinationStockpileId, requirements } = result.data;

    // Update operation in a transaction
    const operation = await prisma.$transaction(async (tx) => {
      // Update the operation
      await tx.operation.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
          ...(scheduledEndAt !== undefined && { scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null }),
          ...(location !== undefined && { location }),
          ...(destinationStockpileId !== undefined && { destinationStockpileId }),
        },
      });

      // Update requirements if provided (replace all)
      if (requirements !== undefined) {
        // Delete existing requirements
        await tx.operationRequirement.deleteMany({
          where: { operationId: id },
        });

        // Create new requirements
        if (requirements.length > 0) {
          await tx.operationRequirement.createMany({
            data: requirements.map((req) => ({
              operationId: id,
              itemCode: req.itemCode,
              quantity: req.quantity,
              priority: req.priority,
            })),
          });
        }
      }

      // Return updated operation
      return tx.operation.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          destinationStockpile: {
            select: {
              id: true,
              name: true,
              hex: true,
              locationName: true,
            },
          },
          requirements: true,
        },
      });
    });

    return NextResponse.json(operation);
  } catch (error) {
    console.error("Error updating operation:", error);
    return NextResponse.json(
      { error: "Failed to update operation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/operations/[id]
 *
 * Delete an operation (ADMIN only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check user has ADMIN permission
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
        { error: "Only admins can delete operations" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify operation exists and belongs to regiment
    const existingOperation = await prisma.operation.findUnique({
      where: { id },
    });

    if (!existingOperation || existingOperation.regimentId !== user.selectedRegimentId) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    // Delete operation (requirements cascade automatically)
    await prisma.operation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting operation:", error);
    return NextResponse.json(
      { error: "Failed to delete operation" },
      { status: 500 }
    );
  }
}
