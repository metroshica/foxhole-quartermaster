import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requireAuth, requirePermission, hasPermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCurrentWar } from "@/lib/foxhole/war-api";

// Schema for creating an operation
const createOperationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
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
  ).optional().default([]),
});

/**
 * GET /api/operations
 *
 * List all operations for the current regiment.
 *
 * Query params:
 * - status: Filter by status (PLANNING, ACTIVE, COMPLETED, CANCELLED)
 */
export async function GET(request: NextRequest) {
  return withSpan("operations.list", async () => {
    try {
      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { session, regimentId } = authResult;

      if (!hasPermission(session, PERMISSIONS.OPERATION_VIEW)) {
        return NextResponse.json([]);
      }

      addSpanAttributes({ "regiment.id": regimentId });

      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get("status");
      const archived = searchParams.get("archived") === "true";

      // Get current war number for scoping
      let currentWarNumber: number | null = null;
      try {
        const war = await getCurrentWar();
        currentWarNumber = war.warNumber;
      } catch {
        // War API down - show all operations
      }

      // Lazy auto-archive: completed operations older than 3 hours
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      await prisma.operation.updateMany({
        where: {
          regimentId,
          status: "COMPLETED",
          archivedAt: null,
          updatedAt: { lte: threeHoursAgo },
        },
        data: { archivedAt: new Date() },
      });

      // Build where clause
      const where: any = {
        regimentId,
      };

      if (archived) {
        where.archivedAt = { not: null };
      } else {
        where.archivedAt = null;
        if (currentWarNumber) {
          where.OR = [
            { warNumber: currentWarNumber },
            { warNumber: null },
          ];
        }
      }

      if (status) {
        where.status = status;
        addSpanAttributes({ "filter.status": status });
      }

      // Get operations
      const operations = await prisma.operation.findMany({
        where,
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
          _count: {
            select: { requirements: true },
          },
        },
        orderBy: [
          { scheduledFor: "asc" },
          { createdAt: "desc" },
        ],
      });

      addSpanAttributes({ "operation.count": operations.length });

      return NextResponse.json(operations);
    } catch (error) {
      console.error("Error fetching operations:", error);
      return NextResponse.json(
        { error: "Failed to fetch operations" },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/operations
 *
 * Create a new operation with requirements.
 */
export async function POST(request: NextRequest) {
  return withSpan("operations.create", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.OPERATION_CREATE);
      if (authResult instanceof NextResponse) return authResult;
      const { userId, regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      // Parse and validate request body
      const body = await request.json();
      const result = createOperationSchema.safeParse(body);

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

      const { name, description, scheduledFor, scheduledEndAt, location, destinationStockpileId, requirements } = result.data;

      addSpanAttributes({
        "operation.name": name,
        "requirement.count": requirements?.length ?? 0,
      });

      // Get current war number
      let warNumber: number | null = null;
      try {
        const war = await getCurrentWar();
        warNumber = war.warNumber;
      } catch {
        // War API down - create without war number
      }

      // Create operation with requirements in a transaction
      const operation = await prisma.$transaction(async (tx) => {
        // Create the operation
        const newOperation = await tx.operation.create({
          data: {
            regimentId,
            name,
            description: description || null,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null,
            location: location || null,
            destinationStockpileId: destinationStockpileId || null,
            createdById: userId,
            warNumber,
          },
        });

        // Create requirements if provided
        if (requirements && requirements.length > 0) {
          await tx.operationRequirement.createMany({
            data: requirements.map((req) => ({
              operationId: newOperation.id,
              itemCode: req.itemCode,
              quantity: req.quantity,
              priority: req.priority,
            })),
          });
        }

        // Return operation with relations
        return tx.operation.findUnique({
          where: { id: newOperation.id },
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

      addSpanAttributes({ "operation.id": operation?.id });

      return NextResponse.json(operation, { status: 201 });
    } catch (error) {
      console.error("Error creating operation:", error);
      return NextResponse.json(
        { error: "Failed to create operation" },
        { status: 500 }
      );
    }
  });
}
