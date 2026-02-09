import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const addMappingSchema = z.object({
  discordRoleId: z.string().min(1, "Discord Role ID is required"),
});

/**
 * POST /api/admin/roles/[id]/mappings
 * Add a Discord role ID mapping to a role
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    // Verify role exists and belongs to regiment
    const role = await prisma.role.findFirst({
      where: { id, regimentId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = addMappingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { discordRoleId } = result.data;

    const mapping = await prisma.roleDiscordMapping.create({
      data: {
        roleId: id,
        discordRoleId,
      },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "This Discord role is already mapped to this role" },
        { status: 409 }
      );
    }

    console.error("Error adding mapping:", error);
    return NextResponse.json({ error: "Failed to add mapping" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roles/[id]/mappings?discordRoleId=...
 * Remove a Discord role ID mapping from a role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    // Verify role exists and belongs to regiment
    const role = await prisma.role.findFirst({
      where: { id, regimentId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const discordRoleId = request.nextUrl.searchParams.get("discordRoleId");
    if (!discordRoleId) {
      return NextResponse.json(
        { error: "discordRoleId query parameter is required" },
        { status: 400 }
      );
    }

    const mapping = await prisma.roleDiscordMapping.findUnique({
      where: {
        roleId_discordRoleId: {
          roleId: id,
          discordRoleId,
        },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    await prisma.roleDiscordMapping.delete({
      where: { id: mapping.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing mapping:", error);
    return NextResponse.json({ error: "Failed to remove mapping" }, { status: 500 });
  }
}
