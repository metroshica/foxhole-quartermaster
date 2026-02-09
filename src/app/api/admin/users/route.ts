import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * GET /api/admin/users
 * Get list of all users (requires admin.manage_users permission)
 */
export async function GET() {
  return withSpan("admin.users.list", async () => {
    try {
      const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS);
      if (authResult instanceof NextResponse) return authResult;
      const { regimentId } = authResult;

      addSpanAttributes({ "regiment.id": regimentId });

      // Get all users with their regiment memberships
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          discordId: true,
          createdAt: true,
          updatedAt: true,
          selectedRegimentId: true,
          regimentMembers: {
            select: {
              regimentId: true,
              permissionLevel: true,
              regiment: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      addSpanAttributes({ "user.count": users.length });

      // Transform data for response
      const usersWithRegiments = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        discordId: u.discordId,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        selectedRegimentId: u.selectedRegimentId,
        regiments: u.regimentMembers.map((rm) => ({
          id: rm.regimentId,
          name: rm.regiment.name,
          permissionLevel: rm.permissionLevel,
        })),
      }));

      return NextResponse.json({
        users: usersWithRegiments,
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
