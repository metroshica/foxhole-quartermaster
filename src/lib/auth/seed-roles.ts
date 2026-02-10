import { prisma } from "@/lib/db/prisma";
import { DEFAULT_ROLES } from "./permissions";

/**
 * Seeds default roles (Admin, Editor, Viewer) for a regiment.
 * Idempotent - skips roles that already exist by name.
 */
export async function seedDefaultRoles(regimentId: string): Promise<void> {
  for (const roleDef of DEFAULT_ROLES) {
    const existing = await prisma.role.findUnique({
      where: { regimentId_name: { regimentId, name: roleDef.name } },
    });

    if (existing) continue;

    await prisma.role.create({
      data: {
        regimentId,
        name: roleDef.name,
        description: roleDef.description,
        isDefault: true,
        position: DEFAULT_ROLES.indexOf(roleDef),
        permissions: {
          create: roleDef.permissions.map((p) => ({ permission: p })),
        },
      },
    });
  }
}
