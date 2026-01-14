import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

/**
 * GET /api/admin/users
 * Get list of all users (ADMIN only)
 */
export async function GET() {
  return withSpan("admin.users.list", async () => {
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

      // Check user has ADMIN permission
      const member = await prisma.regimentMember.findUnique({
        where: {
          userId_regimentId: {
            userId: session.user.id,
            regimentId: user.selectedRegimentId,
          },
        },
      });

      if (!member || member.permissionLevel !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admins can view user list" },
          { status: 403 }
        );
      }

      addSpanAttributes({ "regiment.id": user.selectedRegimentId });

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
