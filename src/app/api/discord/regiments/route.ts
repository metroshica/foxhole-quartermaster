import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { fetchUserGuilds, getGuildIconUrl, getValidAccessToken } from "@/lib/discord/api";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/discord/regiments
 *
 * Fetches the user's Discord servers (presented as regiments) and enriches them with:
 * - Whether the regiment is configured in our system
 * - The regiment icon URL
 *
 * If AUTHORIZED_REGIMENT_IDS is set in environment, only those regiments are returned.
 * Otherwise, all Discord servers the user is in are returned (useful for initial setup).
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get a valid access token (will refresh if expired)
    const accessToken = await getValidAccessToken(session.user.id);

    // Fetch guilds from Discord (Discord API calls them guilds, we present them as regiments)
    const discordGuilds = await fetchUserGuilds(accessToken);

    // Get authorized regiment IDs from environment (if set)
    const authorizedRegimentIds = process.env.AUTHORIZED_REGIMENT_IDS
      ? process.env.AUTHORIZED_REGIMENT_IDS.split(",").map((id) => id.trim())
      : null;

    // Get configured regiments from our database
    const configuredRegiments = await prisma.regiment.findMany({
      select: { discordId: true },
    });
    const configuredSet = new Set(configuredRegiments.map((r) => r.discordId));

    // Filter and enrich regiments
    const regiments = discordGuilds
      .filter((guild) => {
        // If authorized list is set, only include those regiments
        if (authorizedRegimentIds) {
          return authorizedRegimentIds.includes(guild.id);
        }
        // Otherwise include all (useful for setup)
        return true;
      })
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: getGuildIconUrl(guild.id, guild.icon),
        isOwner: guild.owner,
        isConfigured: configuredSet.has(guild.id),
      }));

    return NextResponse.json({ regiments });
  } catch (error) {
    console.error("Error fetching regiments:", error);

    // Provide more specific error messages
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Discord account not found") || message.includes("refresh")) {
      return NextResponse.json(
        { error: "Your Discord session has expired. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch regiments" },
      { status: 500 }
    );
  }
}
