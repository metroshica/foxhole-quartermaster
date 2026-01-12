import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Schema for creating an operation
const createOperationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
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
 * GET /api/operations
 *
 * List all operations for the current regiment.
 *
 * Query params:
 * - status: Filter by status (PLANNING, ACTIVE, COMPLETED, CANCELLED)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {
      regimentId: user.selectedRegimentId,
    };

    if (status) {
      where.status = status;
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

    return NextResponse.json(operations);
  } catch (error) {
    console.error("Error fetching operations:", error);
    return NextResponse.json(
      { error: "Failed to fetch operations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/operations
 *
 * Create a new operation with requirements.
 */
export async function POST(request: NextRequest) {
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
        { error: "You don't have permission to create operations" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createOperationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, scheduledFor, location, destinationStockpileId, requirements } = result.data;

    // Create operation with requirements in a transaction
    const operation = await prisma.$transaction(async (tx) => {
      // Create the operation
      const newOperation = await tx.operation.create({
        data: {
          regimentId: user.selectedRegimentId!,
          name,
          description: description || null,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          location: location || null,
          destinationStockpileId: destinationStockpileId || null,
          createdById: session.user.id,
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

    return NextResponse.json(operation, { status: 201 });
  } catch (error) {
    console.error("Error creating operation:", error);
    return NextResponse.json(
      { error: "Failed to create operation" },
      { status: 500 }
    );
  }
}
