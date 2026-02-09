import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * GET /api/admin/users
 * Get list of users in the current regiment with their roles (requires admin.manage_users permission)
 */
export async function GET() {
  return withSpan("admin.users.list", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      // Get members of the current regiment with their roles and user info
      const members = await prisma.regimentMember.findMany({
        where: { regimentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              discordId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          roles: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      addSpanAttributes({ "user.count": members.length });

      // Transform data for response
      const users = members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        discordId: m.user.discordId,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
        memberCreatedAt: m.createdAt.toISOString(),
        memberUpdatedAt: m.updatedAt.toISOString(),
        roles: m.roles.map((mr) => ({
          roleId: mr.role.id,
          roleName: mr.role.name,
          source: mr.source,
        })),
      }));

      return NextResponse.json({
        users,
        total: users.length,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  });
}
