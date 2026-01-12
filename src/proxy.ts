import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Proxy for Route Protection (Next.js 16+)
 *
 * This runs on every matched request before the page/API is rendered.
 * It uses the auth config to determine access.
 *
 * The authorized callback in authConfig determines:
 * - Whether to allow the request
 * - Whether to redirect to login
 * - Whether to redirect to regiment selection
 *
 * Matcher Configuration:
 * We exclude static assets, images, and public files from proxy
 * to improve performance. Only dynamic routes need protection.
 */
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files (images, etc.)
     * - api/auth routes (handled by NextAuth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
