import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { OWNER_DISCORD_ID } from "@/lib/auth/permissions";
import { z } from "zod";

const putSchema = z.object({
  roleIds: z.array(z.string()).nullable(),
});

/**
 * PUT /api/admin/dev-mode
 * Toggle developer mode for the owner. Checks discordId directly (not permissions)
 * so this still works even when dev mode restricts the owner's permissions.
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check discordId directly - not via permissions (dev mode would block that)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true },
    });

    if (user?.discordId !== OWNER_DISCORD_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = putSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { roleIds } = result.data;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        devModeRoleIds: roleIds ? JSON.stringify(roleIds) : null,
      },
    });

    return NextResponse.json({
      success: true,
      devModeActive: roleIds !== null,
      roleIds,
    });
  } catch (error) {
    console.error("Error toggling dev mode:", error);
    return NextResponse.json({ error: "Failed to toggle dev mode" }, { status: 500 });
  }
}

/**
 * GET /api/admin/dev-mode
 * Get current dev mode state for the owner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true, devModeRoleIds: true },
    });

    if (user?.discordId !== OWNER_DISCORD_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleIds = user.devModeRoleIds ? JSON.parse(user.devModeRoleIds) : null;

    return NextResponse.json({
      devModeActive: roleIds !== null,
      roleIds,
    });
  } catch (error) {
    console.error("Error getting dev mode state:", error);
    return NextResponse.json({ error: "Failed to get dev mode state" }, { status: 500 });
  }
}
