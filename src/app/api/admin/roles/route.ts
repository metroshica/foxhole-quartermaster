import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/check-permission";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/auth/permissions";

const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional().nullable(),
  permissions: z.array(z.string().refine((p) => (ALL_PERMISSIONS as string[]).includes(p), "Invalid permission")),
});

/**
 * GET /api/admin/roles
 * List all roles for the current regiment with permissions and Discord mappings
 */
export async function GET() {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const roles = await prisma.role.findMany({
      where: { regimentId },
      include: {
        permissions: { select: { id: true, permission: true } },
        discordMappings: { select: { id: true, discordRoleId: true } },
        _count: { select: { memberRoles: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

/**
 * POST /api/admin/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const body = await request.json();
    const result = createRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, permissions } = result.data;

    // Get max position for ordering
    const maxPos = await prisma.role.aggregate({
      where: { regimentId },
      _max: { position: true },
    });

    const role = await prisma.role.create({
      data: {
        regimentId,
        name,
        description: description || null,
        position: (maxPos._max.position ?? -1) + 1,
        permissions: {
          create: permissions.map((p) => ({ permission: p })),
        },
      },
      include: {
        permissions: { select: { id: true, permission: true } },
        discordMappings: { select: { id: true, discordRoleId: true } },
        _count: { select: { memberRoles: true } },
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    // Handle unique constraint (duplicate role name)
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
