/**
 * Discord API Helpers
 *
 * Functions for interacting with the Discord API using the user's OAuth token.
 * These are used for:
 * - Fetching the user's Discord servers (Discord calls them "guilds", we present them as "regiments")
 * - Fetching member roles for permission mapping
 *
 * Discord API Rate Limits:
 * - Global: 50 requests per second
 * - Per-route limits vary
 * We don't implement rate limiting here since usage is low,
 * but it should be added if usage increases.
 */

import { prisma } from "@/lib/db/prisma";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Helper to handle Discord API rate limits with retry
 */
async function fetchWithRateLimit(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = data.retry_after || 1;
      console.warn(`Discord rate limit hit, retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded for Discord API rate limit");
}

/**
 * Refresh a Discord access token using the refresh token
 *
 * Discord access tokens expire after ~7 days. This function uses the
 * stored refresh token to obtain a new access token.
 */
async function refreshDiscordToken(accountId: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to refresh Discord token:", error);
    throw new Error("Failed to refresh Discord token");
  }

  const data = await response.json();

  // Update the account with new tokens
  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token;
}

/**
 * Get a valid access token for a user's Discord account
 *
 * If the token is expired, it will be refreshed automatically.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "discord",
    },
  });

  if (!account?.access_token) {
    throw new Error("Discord account not found. Please sign in again.");
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at && account.expires_at < now + 300;

  if (isExpired && account.refresh_token) {
    console.log("Discord token expired, refreshing...");
    return refreshDiscordToken(account.id, account.refresh_token);
  }

  return account.access_token;
}

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
  const response = await fetchWithRateLimit(`${DISCORD_API_BASE}/users/@me/guilds`, {
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
  const response = await fetchWithRateLimit(
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
