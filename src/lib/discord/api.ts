/**
 * Discord API Helpers
 *
 * Functions for interacting with the Discord API using the user's OAuth token.
 * These are used for:
 * - Fetching the user's guilds for guild selection
 * - Fetching member roles for permission mapping
 *
 * Discord API Rate Limits:
 * - Global: 50 requests per second
 * - Per-route limits vary
 * We don't implement rate limiting here since usage is low,
 * but it should be added if usage increases.
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface DiscordGuildMember {
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
  nick: string | null;
  avatar: string | null;
  roles: string[];
  joined_at: string;
}

/**
 * Fetch guilds the user is a member of
 *
 * Requires the 'guilds' OAuth scope.
 * Returns basic guild info - doesn't include full member/role data.
 */
export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Discord API error fetching guilds:", error);
    throw new Error(`Failed to fetch guilds: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the user's member info for a specific guild
 *
 * Requires the 'guilds.members.read' OAuth scope.
 * Returns the user's roles in that guild, which we use for permission mapping.
 *
 * Note: This only works if the user has granted the guilds.members.read scope
 * AND they are a member of the guild.
 */
export async function fetchGuildMember(
  accessToken: string,
  guildId: string
): Promise<DiscordGuildMember> {
  const response = await fetch(
    `${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Discord API error fetching member:", error);
    throw new Error(`Failed to fetch guild member: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the CDN URL for a guild icon
 *
 * Discord stores icons by hash. If the hash starts with "a_",
 * it's an animated GIF, otherwise it's a PNG.
 */
export function getGuildIconUrl(guildId: string, iconHash: string | null): string | null {
  if (!iconHash) return null;

  const extension = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}`;
}

/**
 * Get the CDN URL for a user avatar
 */
export function getUserAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;

  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}
