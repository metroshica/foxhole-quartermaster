import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { fetchUserGuilds, getGuildIconUrl } from "@/lib/discord/api";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/discord/guilds
 *
 * Fetches the user's Discord guilds and enriches them with:
 * - Whether the guild is configured in our system
 * - The guild icon URL
 *
 * If AUTHORIZED_GUILD_IDS is set in environment, only those guilds are returned.
 * Otherwise, all guilds the user is in are returned (useful for initial setup).
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the access token from the account table
    // The token is stored there by NextAuth during OAuth
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "discord",
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Discord token not found. Please sign in again." },
        { status: 401 }
      );
    }

    // Fetch guilds from Discord
    const discordGuilds = await fetchUserGuilds(account.access_token);

    // Get authorized guild IDs from environment (if set)
    const authorizedGuildIds = process.env.AUTHORIZED_GUILD_IDS
      ? process.env.AUTHORIZED_GUILD_IDS.split(",").map((id) => id.trim())
      : null;

    // Get configured guilds from our database
    const configuredGuildIds = await prisma.guildConfig.findMany({
      select: { guildId: true },
    });
    const configuredSet = new Set(configuredGuildIds.map((g) => g.guildId));

    // Filter and enrich guilds
    const guilds = discordGuilds
      .filter((guild) => {
        // If authorized list is set, only include those guilds
        if (authorizedGuildIds) {
          return authorizedGuildIds.includes(guild.id);
        }
        // Otherwise include all guilds (useful for setup)
        return true;
      })
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: getGuildIconUrl(guild.id, guild.icon),
        isOwner: guild.owner,
        isConfigured: configuredSet.has(guild.id),
      }));

    return NextResponse.json({ guilds });
  } catch (error) {
    console.error("Error fetching guilds:", error);
    return NextResponse.json(
      { error: "Failed to fetch guilds" },
      { status: 500 }
    );
  }
}
