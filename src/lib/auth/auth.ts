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
 * - Discord token handling for regiment/role fetching
 *
 * Architecture Decision:
 * We store the Discord access_token in the JWT so we can make Discord API calls
 * to fetch regiments and roles on demand. This avoids storing sensitive tokens in
 * the database while still allowing regiment-related functionality.
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
     * - selectedRegimentId: Currently active regiment
     * - regimentPermission: Permission level in selected regiment
     * - regimentName: Name of selected regiment (for sidebar)
     * - regimentIcon: Icon URL of selected regiment (for sidebar)
     */
    async jwt({ token, user, account }) {
      // Initial sign in - user and account are only available here
      if (account && user) {
        token.accessToken = account.access_token;
        token.discordId = account.providerAccountId;

        // The Prisma adapter already created the user, we just need to
        // update it with the discordId (which the adapter doesn't set)
        const dbUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: account.providerAccountId,
          },
        });

        token.userId = dbUser.id;
        token.selectedRegimentId = dbUser.selectedRegimentId;

        // If user has a selected regiment, fetch their permission level and regiment info
        if (dbUser.selectedRegimentId) {
          const [membership, regiment] = await Promise.all([
            prisma.regimentMember.findUnique({
              where: {
                userId_regimentId: {
                  userId: dbUser.id,
                  regimentId: dbUser.selectedRegimentId,
                },
              },
            }),
            prisma.regiment.findUnique({
              where: { discordId: dbUser.selectedRegimentId },
              select: { name: true, icon: true },
            }),
          ]);
          token.regimentPermission = membership?.permissionLevel ?? null;
          token.regimentName = regiment?.name ?? null;
          token.regimentIcon = regiment?.icon ?? null;
        }
      } else if (token.userId) {
        // On subsequent token refreshes, fetch fresh data from database
        // This ensures selectedRegimentId updates after regiment selection
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { selectedRegimentId: true },
        });

        if (dbUser) {
          token.selectedRegimentId = dbUser.selectedRegimentId;

          // Refresh permission level and regiment info if regiment is selected
          if (dbUser.selectedRegimentId) {
            const [membership, regiment] = await Promise.all([
              prisma.regimentMember.findUnique({
                where: {
                  userId_regimentId: {
                    userId: token.userId as string,
                    regimentId: dbUser.selectedRegimentId,
                  },
                },
              }),
              prisma.regiment.findUnique({
                where: { discordId: dbUser.selectedRegimentId },
                select: { name: true, icon: true },
              }),
            ]);
            token.regimentPermission = membership?.permissionLevel ?? null;
            token.regimentName = regiment?.name ?? null;
            token.regimentIcon = regiment?.icon ?? null;
          } else {
            token.regimentPermission = null;
            token.regimentName = null;
            token.regimentIcon = null;
          }
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
        session.user.selectedRegimentId = token.selectedRegimentId as string | null;
        session.user.regimentPermission = token.regimentPermission as PermissionLevel | null;
        session.user.regimentName = token.regimentName as string | null;
        session.user.regimentIcon = token.regimentIcon as string | null;
      }
      return session;
    },

    /**
     * Sign In Callback - runs after successful authentication
     *
     * We could redirect to regiment selection here, but instead we handle it
     * in the client to provide a smoother UX.
     */
    async signIn({ user, account }) {
      // Allow sign in (we handle regiment selection separately)
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

  const userLevel = session.user.regimentPermission;
  if (!userLevel || levelHierarchy[userLevel] < levelHierarchy[requiredLevel]) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return session;
}
