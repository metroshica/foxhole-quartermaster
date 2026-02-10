import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/check-permission";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  permissions: z.array(z.string().refine((p) => (ALL_PERMISSIONS as string[]).includes(p), "Invalid permission")).optional(),
  position: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/roles/[id]
 * Get a single role with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const role = await prisma.role.findFirst({
      where: { id, regimentId },
      include: {
        permissions: { select: { id: true, permission: true } },
        discordMappings: { select: { id: true, discordRoleId: true } },
        _count: { select: { memberRoles: true } },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/roles/[id]
 * Update a role (name, description, permissions, position)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    // Verify role exists and belongs to regiment
    const existing = await prisma.role.findFirst({
      where: { id, regimentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, permissions, position } = result.data;

    const role = await prisma.$transaction(async (tx) => {
      // Update permissions if provided (replace all)
      if (permissions !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({ roleId: id, permission: p })),
          });
        }
      }

      // Update role metadata
      return tx.role.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(position !== undefined && { position }),
        },
        include: {
          permissions: { select: { id: true, permission: true } },
          discordMappings: { select: { id: true, discordRoleId: true } },
          _count: { select: { memberRoles: true } },
        },
      });
    });

    return NextResponse.json(role);
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete a role (blocked for default roles)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const existing = await prisma.role.findFirst({
      where: { id, regimentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default roles" },
        { status: 400 }
      );
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
