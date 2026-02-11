import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

/**
 * GET /api/admin/scanner-channel
 * Get the current scanner channel configuration for the regiment
 */
export async function GET() {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const regiment = await prisma.regiment.findUnique({
      where: { discordId: regimentId },
      select: { scannerChannelId: true },
    });

    return NextResponse.json({ channelId: regiment?.scannerChannelId || null });
  } catch (error) {
    console.error("Error fetching scanner channel:", error);
    return NextResponse.json({ error: "Failed to fetch scanner channel" }, { status: 500 });
  }
}

const updateSchema = z.object({
  channelId: z.string().nullable(),
});

/**
 * PUT /api/admin/scanner-channel
 * Update the scanner channel for the regiment
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
      data: { scannerChannelId: result.data.channelId },
    });

    return NextResponse.json({ success: true, channelId: result.data.channelId });
  } catch (error) {
    console.error("Error updating scanner channel:", error);
    return NextResponse.json({ error: "Failed to update scanner channel" }, { status: 500 });
  }
}
