/**
 * Add View Permissions Migration
 *
 * Adds the 3 new view permissions (stockpile.view, operation.view, production.view)
 * to ALL existing roles. This preserves current behavior where everyone can see everything.
 *
 * Idempotent: uses skipDuplicates so safe to run multiple times.
 *
 * Usage: bun run scripts/add-view-permissions.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VIEW_PERMISSIONS = [
  "stockpile.view",
  "operation.view",
  "production.view",
];

async function main() {
  console.log("Adding view permissions to all existing roles...\n");

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, regimentId: true },
  });

  console.log(`Found ${roles.length} role(s).\n`);

  let totalAdded = 0;

  for (const role of roles) {
    const result = await prisma.rolePermission.createMany({
      data: VIEW_PERMISSIONS.map((permission) => ({
        roleId: role.id,
        permission,
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      console.log(`  ${role.name} (regiment ${role.regimentId}): added ${result.count} permission(s)`);
      totalAdded += result.count;
    } else {
      console.log(`  ${role.name} (regiment ${role.regimentId}): already up to date`);
    }
  }

  console.log(`\nDone! Added ${totalAdded} permission(s) across ${roles.length} role(s).`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
