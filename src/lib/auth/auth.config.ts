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
    // After sign in, redirect to guild selection if no guild is selected
    // This is handled in the signIn callback below
  },

  callbacks: {
    /**
     * Authorized callback - runs on every request in middleware
     * Returns true if the user is allowed to access the route
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") ||
                           nextUrl.pathname.startsWith("/upload") ||
                           nextUrl.pathname.startsWith("/stockpiles") ||
                           nextUrl.pathname.startsWith("/operations") ||
                           nextUrl.pathname.startsWith("/settings");
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnSelectGuild = nextUrl.pathname === "/select-guild";

      // Redirect logged-in users away from login page
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      // Protect dashboard routes
      if (isOnDashboard) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        // Check if user has selected a guild (handled in session callback)
        return true;
      }

      // Allow access to public routes and guild selection
      return true;
    },
  },
};
