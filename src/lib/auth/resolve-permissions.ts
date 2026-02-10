import { prisma } from "@/lib/db/prisma";
import { ALL_PERMISSIONS, OWNER_DISCORD_ID, type Permission } from "./permissions";

/**
 * Resolves the effective permissions for a user in a regiment.
 *
 * 1. If the user is the owner (by Discord ID):
 *    a. Check for dev mode - if active, resolve from specified roles only (no bypass)
 *    b. Otherwise, they get ALL permissions.
 * 2. Otherwise, looks up the user's assigned roles via RegimentMemberRole
 *    and aggregates all permissions from those roles.
 */
export async function resolveUserPermissions(
  userId: string,
  regimentId: string,
  discordId?: string | null
): Promise<Permission[]> {
  // Owner handling
  if (discordId === OWNER_DISCORD_ID) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { devModeRoleIds: true },
    });

    // If dev mode is active, resolve permissions from specified roles only
    if (user?.devModeRoleIds) {
      const roleIds = JSON.parse(user.devModeRoleIds) as string[];
      if (roleIds.length === 0) return [];

      const roles = await prisma.role.findMany({
        where: { id: { in: roleIds }, regimentId },
        include: {
          permissions: { select: { permission: true } },
        },
      });

      const permissionSet = new Set<string>();
      for (const role of roles) {
        for (const rp of role.permissions) {
          permissionSet.add(rp.permission);
        }
      }
      return Array.from(permissionSet) as Permission[];
    }

    // Normal owner bypass
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
