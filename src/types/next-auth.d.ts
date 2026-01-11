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
 * - selectedGuildId: Currently active guild (null if not selected)
 * - guildPermission: Permission level in the selected guild
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      selectedGuildId: string | null;
      guildPermission: PermissionLevel | null;
    } & DefaultSession["user"];
  }

  interface User {
    discordId?: string;
    selectedGuildId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    discordId?: string;
    accessToken?: string;
    selectedGuildId?: string | null;
    guildPermission?: PermissionLevel | null;
  }
}
