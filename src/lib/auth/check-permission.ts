import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "@/lib/db/prisma";
import { OWNER_DISCORD_ID, type Permission } from "./permissions";
import type { Session } from "next-auth";

export interface AuthContext {
  session: Session;
  userId: string;
  regimentId: string;
}

/**
 * Checks auth, regiment selection, and a specific permission.
 * Returns AuthContext on success, or a NextResponse error.
 *
 * Owner (OWNER_DISCORD_ID) always passes.
 * Fast path: checks session.user.permissions (JWT-cached).
 */
export async function requirePermission(
  permission: Permission
): Promise<AuthContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get regiment
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { selectedRegimentId: true, discordId: true },
  });

  if (!user?.selectedRegimentId) {
    return NextResponse.json({ error: "No regiment selected" }, { status: 400 });
  }

  // Owner bypass - skip if dev mode active
  if (user.discordId === OWNER_DISCORD_ID) {
    const fullUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { devModeRoleIds: true },
    });
    if (!fullUser?.devModeRoleIds) {
      return { session, userId: session.user.id, regimentId: user.selectedRegimentId };
    }
    // Dev mode active - fall through to normal permission check
  }

  // Check JWT-cached permissions (fast path)
  const permissions = session.user.permissions ?? [];
  if (permissions.includes(permission)) {
    return { session, userId: session.user.id, regimentId: user.selectedRegimentId };
  }

  return NextResponse.json(
    { error: "You don't have permission to perform this action" },
    { status: 403 }
  );
}

/**
 * Soft permission check — returns true/false instead of a 403 response.
 * Use after requireAuth() for optional view-gating (e.g. return empty data).
 */
export function hasPermission(session: Session, permission: Permission): boolean {
  return session.user.permissions?.includes(permission) ?? false;
}

/**
 * Checks auth and regiment selection only (for read endpoints).
 * No specific permission required - all authenticated members can read.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { selectedRegimentId: true },
  });

  if (!user?.selectedRegimentId) {
    return NextResponse.json({ error: "No regiment selected" }, { status: 400 });
  }

  return { session, userId: session.user.id, regimentId: user.selectedRegimentId };
}
