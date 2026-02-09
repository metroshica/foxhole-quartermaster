import { prisma } from "@/lib/db/prisma";
import { ALL_PERMISSIONS, OWNER_DISCORD_ID, type Permission } from "./permissions";

/**
 * Resolves the effective permissions for a user in a regiment.
 *
 * 1. If the user is the owner (by Discord ID), they get ALL permissions.
 * 2. Otherwise, looks up the user's assigned roles via RegimentMemberRole
 *    and aggregates all permissions from those roles.
 */
export async function resolveUserPermissions(
  userId: string,
  regimentId: string,
  discordId?: string | null
): Promise<Permission[]> {
  // Owner bypass
  if (discordId === OWNER_DISCORD_ID) {
    return [...ALL_PERMISSIONS];
  }

  // Find the member record
  const member = await prisma.regimentMember.findUnique({
    where: { userId_regimentId: { userId, regimentId } },
    select: { id: true },
  });

  if (!member) return [];

  // Get all permissions through member -> roles -> rolePermissions
  const memberRoles = await prisma.regimentMemberRole.findMany({
    where: { memberId: member.id },
    include: {
      role: {
        include: {
          permissions: { select: { permission: true } },
        },
      },
    },
  });

  // Deduplicate permissions
  const permissionSet = new Set<string>();
  for (const mr of memberRoles) {
    for (const rp of mr.role.permissions) {
      permissionSet.add(rp.permission);
    }
  }

  return Array.from(permissionSet) as Permission[];
}
