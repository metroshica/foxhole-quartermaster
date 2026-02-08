import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { fetchGuildMember } from "@/lib/discord/api";
import type { PermissionLevel } from "@prisma/client";

/**
 * POST /api/auth/select-regiment
 *
 * Sets the user's selected regiment and determines their permission level.
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Verify regiment exists in our config (or create it if user is owner)
 * 3. Fetch user's roles from Discord
 * 4. Map roles to permission level
 * 5. Create/update RegimentMember record
 * 6. Update user's selectedRegimentId
 *
 * The permission level is determined by checking user's Discord roles against
 * the role arrays in Regiment. First match wins (admin > editor > viewer).
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

    // If regiment isn't configured, create it (first user becomes admin)
    if (!regiment) {
      regiment = await prisma.regiment.create({
        data: {
          discordId: regimentId,
          name: regimentName || "Unknown Regiment",
          icon: regimentIcon || null,
          adminRoles: [], // Will be configured later
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

    // Fetch user's roles from Discord
    let userRoles: string[] = [];
    try {
      const member = await fetchGuildMember(account.access_token, regimentId);
      userRoles = member.roles;
    } catch (error) {
      // If we can't fetch roles, user might not have granted the scope
      console.warn("Could not fetch regiment member roles:", error);
    }

    // Determine permission level based on role mappings
    let permissionLevel: PermissionLevel = "VIEWER"; // Default

    // Check admin roles first (highest priority)
    if (regiment.adminRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "ADMIN";
    } else if (regiment.editorRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "EDITOR";
    } else if (regiment.viewerRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "VIEWER";
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

    // If no roles are configured yet, first user gets admin
    const memberCount = await prisma.regimentMember.count({
      where: { regimentId },
    });
    if (memberCount === 0 && !existingMember) {
      permissionLevel = "ADMIN";
    }

    // Create or update regiment membership
    // Don't downgrade existing members unless role mappings explicitly set their level
    const hasRoleMappings =
      regiment.adminRoles.length > 0 ||
      regiment.editorRoles.length > 0 ||
      regiment.viewerRoles.length > 0;

    if (existingMember) {
      // Only update if role mappings are configured, otherwise keep existing permission
      if (hasRoleMappings) {
        await prisma.regimentMember.update({
          where: {
            userId_regimentId: {
              userId: session.user.id,
              regimentId,
            },
          },
          data: { permissionLevel },
        });
      }
      // Keep existing permission level for response
      permissionLevel = hasRoleMappings ? permissionLevel : existingMember.permissionLevel;
    } else {
      // Create new membership
      await prisma.regimentMember.create({
        data: {
          userId: session.user.id,
          regimentId,
          permissionLevel,
        },
      });
    }

    // Update user's selected regiment
    await prisma.user.update({
      where: { id: session.user.id },
      data: { selectedRegimentId: regimentId },
    });

    return NextResponse.json({
      success: true,
      regimentId,
      permissionLevel,
    });
  } catch (error) {
    console.error("Error selecting regiment:", error);
    return NextResponse.json(
      { error: "Failed to select regiment" },
      { status: 500 }
    );
  }
}
