import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

/**
 * GET /api/admin/users/[id]/roles
 * Get a user's current roles with source info for the current regiment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;
    const { id: userId } = await params;

    const member = await prisma.regimentMember.findUnique({
      where: { userId_regimentId: { userId, regimentId } },
      select: {
        id: true,
        roles: {
          include: {
            role: {
              select: { id: true, name: true, description: true },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "User is not a member of this regiment" }, { status: 404 });
    }

    const roles = member.roles.map((mr) => ({
      roleId: mr.role.id,
      roleName: mr.role.name,
      roleDescription: mr.role.description,
      source: mr.source,
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json({ error: "Failed to fetch user roles" }, { status: 500 });
  }
}

const putSchema = z.object({
  roleIds: z.array(z.string()),
});

/**
 * PUT /api/admin/users/[id]/roles
 * Set the complete list of manual roles for a user in the current regiment.
 * Discord-sourced roles are untouched.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;
    const { id: userId } = await params;

    const body = await request.json();
    const result = putSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { roleIds } = result.data;

    // Verify the roles belong to this regiment
    if (roleIds.length > 0) {
      const validRoles = await prisma.role.count({
        where: { id: { in: roleIds }, regimentId },
      });
      if (validRoles !== roleIds.length) {
        return NextResponse.json({ error: "One or more roles do not belong to this regiment" }, { status: 400 });
      }
    }

    const member = await prisma.regimentMember.findUnique({
      where: { userId_regimentId: { userId, regimentId } },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "User is not a member of this regiment" }, { status: 404 });
    }

    // Get current manual roles
    const currentManualRoles = await prisma.regimentMemberRole.findMany({
      where: { memberId: member.id, source: "manual" },
      select: { roleId: true },
    });
    const currentManualIds = new Set(currentManualRoles.map((r) => r.roleId));
    const newManualIds = new Set(roleIds);

    // Delete manual roles not in the new list
    const toRemove = [...currentManualIds].filter((id) => !newManualIds.has(id));
    if (toRemove.length > 0) {
      await prisma.regimentMemberRole.deleteMany({
        where: { memberId: member.id, source: "manual", roleId: { in: toRemove } },
      });
    }

    // Add new manual roles (skip if already exists as discord role - unique constraint)
    const toAdd = [...newManualIds].filter((id) => !currentManualIds.has(id));
    if (toAdd.length > 0) {
      // Check which ones already exist (as discord-sourced)
      const existingAny = await prisma.regimentMemberRole.findMany({
        where: { memberId: member.id, roleId: { in: toAdd } },
        select: { roleId: true },
      });
      const existingIds = new Set(existingAny.map((r) => r.roleId));
      const actuallyNew = toAdd.filter((id) => !existingIds.has(id));

      if (actuallyNew.length > 0) {
        await prisma.regimentMemberRole.createMany({
          data: actuallyNew.map((roleId) => ({ memberId: member.id, roleId, source: "manual" })),
          skipDuplicates: true,
        });
      }
    }

    // Return updated roles
    const updatedRoles = await prisma.regimentMemberRole.findMany({
      where: { memberId: member.id },
      include: {
        role: { select: { id: true, name: true, description: true } },
      },
    });

    const roles = updatedRoles.map((mr) => ({
      roleId: mr.role.id,
      roleName: mr.role.name,
      roleDescription: mr.role.description,
      source: mr.source,
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error updating user roles:", error);
    return NextResponse.json({ error: "Failed to update user roles" }, { status: 500 });
  }
}
