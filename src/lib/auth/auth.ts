import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";
import type { PermissionLevel } from "@prisma/client";

/**
 * Full NextAuth Configuration
 *
 * This extends the edge-compatible config with:
 * - Prisma adapter for database persistence
 * - Session and JWT callbacks for custom session data
 * - Discord token handling for guild/role fetching
 *
 * Architecture Decision:
 * We store the Discord access_token in the JWT so we can make Discord API calls
 * to fetch guilds and roles on demand. This avoids storing sensitive tokens in
 * the database while still allowing guild-related functionality.
 */

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  // Use JWT strategy for session (enables edge middleware compatibility)
  session: {
    strategy: "jwt",
  },

  callbacks: {
    ...authConfig.callbacks,

    /**
     * JWT Callback - runs when JWT is created or updated
     *
     * We extend the token with:
     * - discordId: The user's Discord ID
     * - accessToken: Discord OAuth token for API calls
     * - selectedGuildId: Currently active guild
     * - guildPermission: Permission level in selected guild
     */
    async jwt({ token, user, account }) {
      // Initial sign in - user and account are only available here
      if (account && user) {
        token.accessToken = account.access_token;
        token.discordId = account.providerAccountId;

        // Fetch or create user record with discordId
        const dbUser = await prisma.user.upsert({
          where: { discordId: account.providerAccountId },
          update: {
            name: user.name,
            email: user.email,
            image: user.image,
          },
          create: {
            discordId: account.providerAccountId,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        });

        token.userId = dbUser.id;
        token.selectedGuildId = dbUser.selectedGuildId;

        // If user has a selected guild, fetch their permission level
        if (dbUser.selectedGuildId) {
          const membership = await prisma.guildMember.findUnique({
            where: {
              userId_guildId: {
                userId: dbUser.id,
                guildId: dbUser.selectedGuildId,
              },
            },
          });
          token.guildPermission = membership?.permissionLevel ?? null;
        }
      }

      return token;
    },

    /**
     * Session Callback - shapes the session object sent to the client
     *
     * Only include data that's safe to expose to the browser.
     * The full Discord access token stays in the JWT (server-side only).
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.discordId = token.discordId as string;
        session.user.selectedGuildId = token.selectedGuildId as string | null;
        session.user.guildPermission = token.guildPermission as PermissionLevel | null;
      }
      return session;
    },

    /**
     * Sign In Callback - runs after successful authentication
     *
     * We could redirect to guild selection here, but instead we handle it
     * in the client to provide a smoother UX.
     */
    async signIn({ user, account }) {
      // Allow sign in (we handle guild selection separately)
      return true;
    },
  },

  events: {
    /**
     * Create Account Event - fires when a new OAuth account is linked
     *
     * This is where we could do initial setup for new users.
     */
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },
});

/**
 * Helper to get the current session with full typing
 * Use this in server components and API routes
 */
export async function getSession() {
  return await auth();
}

/**
 * Helper to require authentication
 * Throws if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Helper to require a specific permission level
 * Throws if user doesn't have sufficient permissions
 */
export async function requirePermission(requiredLevel: PermissionLevel) {
  const session = await requireAuth();

  const levelHierarchy: Record<PermissionLevel, number> = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
  };

  const userLevel = session.user.guildPermission;
  if (!userLevel || levelHierarchy[userLevel] < levelHierarchy[requiredLevel]) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return session;
}
