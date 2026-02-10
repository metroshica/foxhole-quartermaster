import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

/**
 * Edge-Compatible Auth Configuration
 *
 * This configuration is used by middleware (which runs on Edge runtime).
 * It cannot include database adapters or other Node.js-specific code.
 *
 * The full configuration with Prisma adapter is in auth.ts.
 *
 * Discord OAuth Scopes:
 * - identify: Basic user info (id, username, avatar)
 * - email: User's email address
 * - guilds: List of guilds the user is in
 * - guilds.members.read: Read member info (roles) for guilds the bot is in
 */
export const authConfig: NextAuthConfig = {
  // Trust the host when behind a reverse proxy (Cloudflare)
  trustHost: true,

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request scopes needed for guild selection and role checking
          scope: "identify email guilds guilds.members.read",
        },
      },
    }),
  ],

  pages: {
    signIn: "/login",
    // After sign in, redirect to regiment selection if no regiment is selected
    // This is handled in the signIn callback below
  },

  callbacks: {
    /**
     * Authorized callback - runs on every request in middleware
     * Returns true if the user is allowed to access the route
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/select-regiment" ||
        nextUrl.pathname.startsWith("/api/") ||
        nextUrl.pathname === "/icon.svg" ||
        nextUrl.pathname.startsWith("/_next/");

      // Redirect logged-in users away from login page
      if (nextUrl.pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      // Protect all non-public routes
      if (!isPublicRoute && !isLoggedIn) {
        const callbackUrl = encodeURIComponent(
          nextUrl.pathname + nextUrl.search,
        );
        return Response.redirect(
          new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl),
        );
      }

      return true;
    },
  },
};
