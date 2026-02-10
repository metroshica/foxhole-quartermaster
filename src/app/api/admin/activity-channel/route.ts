import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

/**
 * GET /api/admin/activity-channel
 * Get the current activity channel configuration for the regiment
 */
export async function GET() {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const regiment = await prisma.regiment.findUnique({
      where: { discordId: regimentId },
      select: { activityChannelId: true },
    });

    return NextResponse.json({ channelId: regiment?.activityChannelId || null });
  } catch (error) {
    console.error("Error fetching activity channel:", error);
    return NextResponse.json({ error: "Failed to fetch activity channel" }, { status: 500 });
  }
}

const updateSchema = z.object({
  channelId: z.string().nullable(),
});

/**
 * PUT /api/admin/activity-channel
 * Update the activity channel for the regiment
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await prisma.regiment.update({
      where: { discordId: regimentId },
      data: { activityChannelId: result.data.channelId },
    });

    return NextResponse.json({ success: true, channelId: result.data.channelId });
  } catch (error) {
    console.error("Error updating activity channel:", error);
    return NextResponse.json({ error: "Failed to update activity channel" }, { status: 500 });
  }
}
