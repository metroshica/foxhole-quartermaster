import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ shortId: string }>;
}

/**
 * GET /api/orders/production/by-short-id/[shortId]
 * Look up an order by its short ID and return the full ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shortId } = await params;

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

    if (!session.user.permissions?.includes(PERMISSIONS.PRODUCTION_VIEW)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const order = await prisma.productionOrder.findFirst({
      where: {
        shortId,
        regimentId: user.selectedRegimentId,
      },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ id: order.id });
  } catch (error) {
    console.error("Error looking up order by shortId:", error);
    return NextResponse.json(
      { error: "Failed to look up order" },
      { status: 500 }
    );
  }
}
