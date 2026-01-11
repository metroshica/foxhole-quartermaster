"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Session Provider Wrapper
 *
 * Wraps the NextAuth SessionProvider for use in the app.
 * This is a client component that provides session context to all children.
 *
 * We need this wrapper because the SessionProvider is a client component,
 * and we want to use it in the root layout (which is a server component).
 */

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
