import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { fetchGuildMember } from "@/lib/discord/api";
import { seedDefaultRoles } from "@/lib/auth/seed-roles";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";
import { derivePermissionLevel } from "@/lib/auth/auth";
import { OWNER_DISCORD_ID } from "@/lib/auth/permissions";

/**
 * POST /api/auth/select-regiment
 *
 * Sets the user's selected regiment and determines their permissions.
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Find or create the regiment
 * 3. Seed default roles if not present
 * 4. Fetch user's Discord roles
 * 5. Match Discord roles against RoleDiscordMapping to find app roles
 * 6. If no mappings configured: first member gets Admin, subsequent get Viewer
 * 7. Sync RegimentMemberRole records
 * 8. Compute permissions and update permissionLevel for backward compat
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { regimentId, regimentName, regimentIcon } = body;

    if (!regimentId) {
      return NextResponse.json({ error: "Regiment ID required" }, { status: 400 });
    }

    // Get the Discord access token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "discord",
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Discord token not found" },
        { status: 401 }
      );
    }

    // Check if regiment is configured
    let regiment = await prisma.regiment.findUnique({
      where: { discordId: regimentId },
    });

    // If regiment isn't configured, create it
    if (!regiment) {
      regiment = await prisma.regiment.create({
        data: {
          discordId: regimentId,
          name: regimentName || "Unknown Regiment",
          icon: regimentIcon || null,
          adminRoles: [],
          editorRoles: [],
          viewerRoles: [],
        },
      });
    } else if (regimentName || regimentIcon) {
      // Update name/icon from Discord in case they changed
      regiment = await prisma.regiment.update({
        where: { discordId: regimentId },
        data: {
          ...(regimentName && { name: regimentName }),
          ...(regimentIcon !== undefined && { icon: regimentIcon || null }),
        },
      });
    }

    // Seed default roles if they don't exist yet
    await seedDefaultRoles(regimentId);

    // Fetch user's Discord roles
    let userDiscordRoles: string[] = [];
    try {
      const member = await fetchGuildMember(account.access_token, regimentId);
      userDiscordRoles = member.roles;
    } catch (error) {
      console.warn("Could not fetch regiment member roles:", error);
    }

    // Check if user already has a membership
    const existingMember = await prisma.regimentMember.findUnique({
      where: {
        userId_regimentId: {
          userId: session.user.id,
          regimentId,
        },
      },
    });

    // One-time migration: if regiment has old-style role arrays but no Discord mappings
    // in the new system, migrate them
    await migrateOldRoleMappings(regimentId, regiment);

    // Find which app roles match the user's Discord roles via RoleDiscordMapping
    const matchedRoles = await prisma.role.findMany({
      where: {
        regimentId,
        discordMappings: {
          some: {
            discordRoleId: { in: userDiscordRoles },
          },
        },
      },
      select: { id: true },
    });

    // Check if any Discord mappings exist at all for this regiment
    const totalMappings = await prisma.roleDiscordMapping.count({
      where: { role: { regimentId } },
    });

    const memberCount = await prisma.regimentMember.count({
      where: { regimentId },
    });

    // Determine which role(s) to assign
    let roleIdsToAssign: string[] = matchedRoles.map((r) => r.id);

    if (totalMappings === 0) {
      // No Discord mappings configured - use default logic
      const isOwner = session.user.discordId === OWNER_DISCORD_ID;
      const isFirstMember = memberCount === 0 && !existingMember;

      if (isOwner || isFirstMember) {
        // Owner or first member gets Admin
        const adminRole = await prisma.role.findUnique({
          where: { regimentId_name: { regimentId, name: "Admin" } },
        });
        if (adminRole) roleIdsToAssign = [adminRole.id];
      } else if (!existingMember) {
        // Subsequent new members get Viewer
        const viewerRole = await prisma.role.findUnique({
          where: { regimentId_name: { regimentId, name: "Viewer" } },
        });
        if (viewerRole) roleIdsToAssign = [viewerRole.id];
      }
      // If existing member and no mappings, keep their existing roles
    }

    // Create or update regiment membership
    let memberId: string;
    if (existingMember) {
      memberId = existingMember.id;
    } else {
      const newMember = await prisma.regimentMember.create({
        data: {
          userId: session.user.id,
          regimentId,
          permissionLevel: "VIEWER", // Will be updated below
        },
      });
      memberId = newMember.id;
    }

    // Sync RegimentMemberRole records (only if we have roles to assign)
    if (roleIdsToAssign.length > 0 || !existingMember) {
      if (roleIdsToAssign.length > 0) {
        // Get current role assignments
        const currentRoles = await prisma.regimentMemberRole.findMany({
          where: { memberId },
          select: { roleId: true },
        });
        const currentRoleIds = new Set(currentRoles.map((r) => r.roleId));
        const newRoleIds = new Set(roleIdsToAssign);

        // Remove roles no longer matched
        const toRemove = [...currentRoleIds].filter((id) => !newRoleIds.has(id));
        if (toRemove.length > 0) {
          await prisma.regimentMemberRole.deleteMany({
            where: { memberId, roleId: { in: toRemove } },
          });
        }

        // Add newly matched roles
        const toAdd = [...newRoleIds].filter((id) => !currentRoleIds.has(id));
        if (toAdd.length > 0) {
          await prisma.regimentMemberRole.createMany({
            data: toAdd.map((roleId) => ({ memberId, roleId })),
            skipDuplicates: true,
          });
        }
      }
    }

    // Resolve final permissions
    const permissions = await resolveUserPermissions(
      session.user.id,
      regimentId,
      session.user.discordId
    );

    // Derive legacy permissionLevel for backward compat
    const permissionLevel = derivePermissionLevel(permissions);

    // Update permissionLevel on member record
    await prisma.regimentMember.update({
      where: { userId_regimentId: { userId: session.user.id, regimentId } },
      data: { permissionLevel },
    });

    // Update user's selected regiment
    await prisma.user.update({
      where: { id: session.user.id },
      data: { selectedRegimentId: regimentId },
    });

    return NextResponse.json({
      success: true,
      regimentId,
      permissionLevel,
      permissions,
    });
  } catch (error) {
    console.error("Error selecting regiment:", error);
    return NextResponse.json(
      { error: "Failed to select regiment" },
      { status: 500 }
    );
  }
}

/**
 * One-time migration: converts old adminRoles/editorRoles/viewerRoles arrays
 * on the Regiment model into RoleDiscordMapping records in the new system.
 */
async function migrateOldRoleMappings(
  regimentId: string,
  regiment: { adminRoles: string[]; editorRoles: string[]; viewerRoles: string[] }
): Promise<void> {
  const hasOldMappings =
    regiment.adminRoles.length > 0 ||
    regiment.editorRoles.length > 0 ||
    regiment.viewerRoles.length > 0;

  if (!hasOldMappings) return;

  // Check if we already migrated (any mappings exist for this regiment)
  const existingMappings = await prisma.roleDiscordMapping.count({
    where: { role: { regimentId } },
  });

  if (existingMappings > 0) return;

  // Migrate each old role array to the corresponding default role
  const migrations: { roleName: string; discordRoleIds: string[] }[] = [
    { roleName: "Admin", discordRoleIds: regiment.adminRoles },
    { roleName: "Editor", discordRoleIds: regiment.editorRoles },
    { roleName: "Viewer", discordRoleIds: regiment.viewerRoles },
  ];

  for (const { roleName, discordRoleIds } of migrations) {
    if (discordRoleIds.length === 0) continue;

    const role = await prisma.role.findUnique({
      where: { regimentId_name: { regimentId, name: roleName } },
    });

    if (!role) continue;

    await prisma.roleDiscordMapping.createMany({
      data: discordRoleIds.map((discordRoleId) => ({
        roleId: role.id,
        discordRoleId,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`[RBAC] Migrated old role mappings for regiment ${regimentId}`);
}
