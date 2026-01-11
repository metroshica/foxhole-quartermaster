import { handlers } from "@/lib/auth/auth";

/**
 * NextAuth API Route Handler
 *
 * This catch-all route handles all NextAuth.js endpoints:
 * - GET /api/auth/signin - Sign in page
 * - POST /api/auth/signin/:provider - Initiate OAuth flow
 * - GET /api/auth/callback/:provider - OAuth callback
 * - GET /api/auth/signout - Sign out page
 * - POST /api/auth/signout - Sign out action
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/csrf - Get CSRF token
 * - GET /api/auth/providers - List available providers
 */
export const { GET, POST } = handlers;
