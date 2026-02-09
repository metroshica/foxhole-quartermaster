/**
 * RBAC Migration Script
 *
 * Migrates existing regiments from the old 3-level permission system
 * to the new granular RBAC system.
 *
 * For each regiment:
 * 1. Creates 3 default roles (Admin, Editor, Viewer) if missing
 * 2. Migrates adminRoles[] -> Admin role's RoleDiscordMapping records
 * 3. Migrates editorRoles[] -> Editor role's RoleDiscordMapping records
 * 4. Migrates viewerRoles[] -> Viewer role's RoleDiscordMapping records
 * 5. For each RegimentMember, creates RegimentMemberRole matching their permissionLevel
 *
 * Usage: bun run scripts/migrate-rbac.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: "Admin",
    description: "Full access to all features and settings",
    permissions: [
      "stockpile.create", "stockpile.update", "stockpile.delete", "stockpile.refresh",
      "operation.create", "operation.update", "operation.delete",
      "production.create", "production.update", "production.delete", "production.update_items",
      "scanner.upload",
      "admin.manage_users", "admin.manage_roles",
    ],
  },
  {
    name: "Editor",
    description: "Can create and modify stockpiles, operations, and production orders",
    permissions: [
      "stockpile.create", "stockpile.update", "stockpile.refresh",
      "operation.create", "operation.update",
      "production.create", "production.update", "production.update_items",
      "scanner.upload",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to all data",
    permissions: [],
  },
];

async function main() {
  console.log("Starting RBAC migration...\n");

  const regiments = await prisma.regiment.findMany();
  console.log(`Found ${regiments.length} regiment(s) to migrate.\n`);

  for (const regiment of regiments) {
    console.log(`\n--- Regiment: ${regiment.name} (${regiment.discordId}) ---`);

    // 1. Create default roles if missing
    for (let i = 0; i < DEFAULT_ROLES.length; i++) {
      const roleDef = DEFAULT_ROLES[i];
      const existing = await prisma.role.findUnique({
        where: {
          regimentId_name: {
            regimentId: regiment.discordId,
            name: roleDef.name,
          },
        },
      });

      if (existing) {
        console.log(`  Role "${roleDef.name}" already exists, skipping.`);
        continue;
      }

      await prisma.role.create({
        data: {
          regimentId: regiment.discordId,
          name: roleDef.name,
          description: roleDef.description,
          isDefault: true,
          position: i,
          permissions: {
            create: roleDef.permissions.map((p) => ({ permission: p })),
          },
        },
      });
      console.log(`  Created role "${roleDef.name}" with ${roleDef.permissions.length} permissions.`);
    }

    // 2. Migrate old Discord role mappings
    const roleMap: Record<string, string[]> = {
      Admin: regiment.adminRoles,
      Editor: regiment.editorRoles,
      Viewer: regiment.viewerRoles,
    };

    for (const [roleName, discordRoleIds] of Object.entries(roleMap)) {
      if (discordRoleIds.length === 0) continue;

      const role = await prisma.role.findUnique({
        where: {
          regimentId_name: {
            regimentId: regiment.discordId,
            name: roleName,
          },
        },
      });

      if (!role) continue;

      // Check if mappings already exist
      const existingMappings = await prisma.roleDiscordMapping.count({
        where: { roleId: role.id },
      });

      if (existingMappings > 0) {
        console.log(`  Discord mappings for "${roleName}" already exist (${existingMappings}), skipping.`);
        continue;
      }

      await prisma.roleDiscordMapping.createMany({
        data: discordRoleIds.map((discordRoleId) => ({
          roleId: role.id,
          discordRoleId,
        })),
        skipDuplicates: true,
      });
      console.log(`  Migrated ${discordRoleIds.length} Discord role(s) -> "${roleName}".`);
    }

    // 3. Assign roles to existing members based on their permissionLevel
    const members = await prisma.regimentMember.findMany({
      where: { regimentId: regiment.discordId },
      include: {
        roles: true, // RegimentMemberRole
      },
    });

    let assignedCount = 0;
    for (const member of members) {
      // Skip if member already has role assignments
      if (member.roles.length > 0) continue;

      const roleName =
        member.permissionLevel === "ADMIN"
          ? "Admin"
          : member.permissionLevel === "EDITOR"
            ? "Editor"
            : "Viewer";

      const role = await prisma.role.findUnique({
        where: {
          regimentId_name: {
            regimentId: regiment.discordId,
            name: roleName,
          },
        },
      });

      if (!role) continue;

      await prisma.regimentMemberRole.create({
        data: {
          memberId: member.id,
          roleId: role.id,
        },
      });
      assignedCount++;
    }
    console.log(`  Assigned roles to ${assignedCount} member(s) (${members.length - assignedCount} already had roles).`);
  }

  console.log("\n\nRBAC migration complete!");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
