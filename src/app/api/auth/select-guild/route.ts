import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { fetchGuildMember } from "@/lib/discord/api";
import type { PermissionLevel } from "@prisma/client";

/**
 * POST /api/auth/select-guild
 *
 * Sets the user's selected guild and determines their permission level.
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Verify guild exists in our config (or create it if user is owner)
 * 3. Fetch user's roles from Discord
 * 4. Map roles to permission level
 * 5. Create/update GuildMember record
 * 6. Update user's selectedGuildId
 *
 * The permission level is determined by checking user's Discord roles against
 * the role arrays in GuildConfig. First match wins (admin > editor > viewer).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { guildId, guildName, guildIcon } = body;

    if (!guildId) {
      return NextResponse.json({ error: "Guild ID required" }, { status: 400 });
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

    // Check if guild is configured
    let guildConfig = await prisma.guildConfig.findUnique({
      where: { guildId },
    });

    // If guild isn't configured, create it (first user becomes admin)
    if (!guildConfig) {
      guildConfig = await prisma.guildConfig.create({
        data: {
          guildId,
          guildName: guildName || "Unknown Guild",
          guildIcon: guildIcon || null,
          adminRoles: [], // Will be configured later
          editorRoles: [],
          viewerRoles: [],
        },
      });
    }

    // Fetch user's roles from Discord
    let userRoles: string[] = [];
    try {
      const member = await fetchGuildMember(account.access_token, guildId);
      userRoles = member.roles;
    } catch (error) {
      // If we can't fetch roles, user might not have granted the scope
      console.warn("Could not fetch guild member roles:", error);
    }

    // Determine permission level based on role mappings
    let permissionLevel: PermissionLevel = "VIEWER"; // Default

    // Check admin roles first (highest priority)
    if (guildConfig.adminRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "ADMIN";
    } else if (guildConfig.editorRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "EDITOR";
    } else if (guildConfig.viewerRoles.some((role) => userRoles.includes(role))) {
      permissionLevel = "VIEWER";
    }

    // If no roles are configured yet, first user gets admin
    const memberCount = await prisma.guildMember.count({
      where: { guildId },
    });
    if (memberCount === 0) {
      permissionLevel = "ADMIN";
    }

    // Create or update guild membership
    await prisma.guildMember.upsert({
      where: {
        userId_guildId: {
          userId: session.user.id,
          guildId,
        },
      },
      update: {
        permissionLevel,
      },
      create: {
        userId: session.user.id,
        guildId,
        permissionLevel,
      },
    });

    // Update user's selected guild
    await prisma.user.update({
      where: { id: session.user.id },
      data: { selectedGuildId: guildId },
    });

    return NextResponse.json({
      success: true,
      guildId,
      permissionLevel,
    });
  } catch (error) {
    console.error("Error selecting guild:", error);
    return NextResponse.json(
      { error: "Failed to select guild" },
      { status: 500 }
    );
  }
}
