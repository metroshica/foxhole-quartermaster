import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission, hasPermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notifyActivity } from "@/lib/discord/activity-notifications";

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
  return withSpan("operations.get", async () => {
    try {
      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { session, regimentId } = authResult;

      if (!hasPermission(session, PERMISSIONS.OPERATION_VIEW)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const { id } = await params;
      addSpanAttributes({ "operation.id": id });

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
      if (operation.regimentId !== regimentId) {
        return NextResponse.json(
          { error: "Operation not found" },
          { status: 404 }
        );
      }

      addSpanAttributes({ "requirement.count": operation.requirements.length });

      // Get aggregate inventory for required items
      const itemCodes = operation.requirements.map(r => r.itemCode);

      const inventoryItems = await prisma.stockpileItem.groupBy({
        by: ["itemCode"],
        where: {
          itemCode: { in: itemCodes },
          stockpile: {
            regimentId,
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

      addSpanAttributes({
        "summary.total_required": totalRequired,
        "summary.total_deficit": totalDeficit,
        "summary.items_with_deficit": itemsWithDeficit,
      });

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
  });
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
  return withSpan("operations.update", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.OPERATION_UPDATE);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      const { id } = await params;
      addSpanAttributes({ "operation.id": id });

      // Verify operation exists and belongs to regiment
      const existingOperation = await prisma.operation.findUnique({
        where: { id },
      });

      if (!existingOperation || existingOperation.regimentId !== regimentId) {
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

      if (requirements !== undefined) {
        addSpanAttributes({ "requirement.count": requirements.length });
      }

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

      // Fire-and-forget activity notification on status change
      if (status && status !== existingOperation.status && operation) {
        const authUser = await prisma.user.findUnique({ where: { id: authResult.userId }, select: { name: true } });
        const action = status === "ACTIVE" ? "started" as const :
                       status === "COMPLETED" ? "completed" as const :
                       status === "CANCELLED" ? "cancelled" as const : null;
        if (action) {
          notifyActivity(regimentId, {
            type: "OPERATION",
            userName: authUser?.name || "Unknown",
            operationName: operation.name,
            action,
            location: operation.location,
          });
        }
      }

      return NextResponse.json(operation);
    } catch (error) {
      console.error("Error updating operation:", error);
      return NextResponse.json(
        { error: "Failed to update operation" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/operations/[id]
 *
 * Delete an operation.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSpan("operations.delete", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.OPERATION_DELETE);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      const { id } = await params;
      addSpanAttributes({ "operation.id": id });

      // Verify operation exists and belongs to regiment
      const existingOperation = await prisma.operation.findUnique({
        where: { id },
      });

      if (!existingOperation || existingOperation.regimentId !== regimentId) {
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
  });
}
