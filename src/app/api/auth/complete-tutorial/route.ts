import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/auth/complete-tutorial
 *
 * Marks the tutorial as completed for the authenticated user.
 * This endpoint is called when the user finishes or skips the tutorial.
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user's tutorial status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tutorialCompleted: true,
        tutorialCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing tutorial:", error);
    return NextResponse.json(
      { error: "Failed to complete tutorial" },
      { status: 500 }
    );
  }
}
