import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/check-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fetchGuildChannels } from "@/lib/discord/api";

/**
 * GET /api/admin/scanner-channel/channels
 * List text channels in the regiment's Discord guild (using bot token)
 */
export async function GET() {
  try {
    const authResult = await requirePermission(PERMISSIONS.ADMIN_MANAGE_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const { regimentId } = authResult;

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured. Set DISCORD_BOT_TOKEN in environment." },
        { status: 503 }
      );
    }

    const channels = await fetchGuildChannels(regimentId, botToken);
    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error fetching guild channels:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}
