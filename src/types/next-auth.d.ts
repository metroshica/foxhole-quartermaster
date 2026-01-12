import type { PermissionLevel } from "@prisma/client";
import type { DefaultSession, DefaultJWT } from "next-auth";

/**
 * NextAuth Type Augmentation
 *
 * Extends the default NextAuth types to include our custom session fields.
 * This provides type safety when accessing session.user properties.
 *
 * Key additions:
 * - discordId: The user's Discord ID for API calls
 * - selectedRegimentId: Currently active regiment (null if not selected)
 * - regimentPermission: Permission level in the selected regiment
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      selectedRegimentId: string | null;
      regimentPermission: PermissionLevel | null;
    } & DefaultSession["user"];
  }

  interface User {
    discordId?: string;
    selectedRegimentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    discordId?: string;
    accessToken?: string;
    selectedRegimentId?: string | null;
    regimentPermission?: PermissionLevel | null;
  }
}
