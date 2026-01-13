import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

type ActivityType = "SCAN" | "PRODUCTION" | "OPERATION";

interface ItemChange {
  itemCode: string;
  displayName: string;
  change: number;
  crated: boolean;
}

interface BaseActivity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar: string | null;
  timestamp: string;
}

interface ScanActivity extends BaseActivity {
  type: "SCAN";
  scan: {
    stockpileName: string;
    stockpileHex: string;
    totalAdded: number;
    totalRemoved: number;
    points: number;
    itemChanges: ItemChange[];
  };
}

interface ProductionActivity extends BaseActivity {
  type: "PRODUCTION";
  production: {
    orderName: string;
    itemCode: string;
    itemName: string;
    quantity: number;
  };
}

interface OperationActivity extends BaseActivity {
  type: "OPERATION";
  operation: {
    operationName: string;
    action: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED";
  };
}

type ActivityItem = ScanActivity | ProductionActivity | OperationActivity;

/**
 * GET /api/activity
 * Get recent activity feed for the current regiment
 *
 * Query params:
 * - limit: number (default: 20)
 * - types: comma-separated list of activity types (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { selectedRegimentId: true },
    });

    if (!user?.selectedRegimentId) {
      return NextResponse.json(
        { error: "No regiment selected" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const typesParam = searchParams.get("types");
    const types = typesParam
      ? (typesParam.split(",") as ActivityType[])
      : ["SCAN", "PRODUCTION", "OPERATION"];

    const activities: ActivityItem[] = [];

    // Fetch scan activities
    if (types.includes("SCAN")) {
      const stockpiles = await prisma.stockpile.findMany({
        where: { regimentId: user.selectedRegimentId },
        select: { id: true },
      });
      const stockpileIds = stockpiles.map((s) => s.id);

      if (stockpileIds.length > 0) {
        const scans = await prisma.stockpileScan.findMany({
          where: { stockpileId: { in: stockpileIds } },
          include: {
            stockpile: {
              select: { name: true, hex: true },
            },
            scannedBy: {
              select: { id: true, name: true, image: true },
            },
            scanItems: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        // Get previous scans for diff calculation
        for (const scan of scans) {
          const previousScan = await prisma.stockpileScan.findFirst({
            where: {
              stockpileId: scan.stockpileId,
              createdAt: { lt: scan.createdAt },
            },
            include: { scanItems: true },
            orderBy: { createdAt: "desc" },
          });

          // Calculate diff
          const currentItems = new Map<string, number>();
          for (const item of scan.scanItems) {
            const key = `${item.itemCode}-${item.crated}`;
            currentItems.set(key, item.quantity);
          }

          const previousItems = new Map<string, number>();
          if (previousScan) {
            for (const item of previousScan.scanItems) {
              const key = `${item.itemCode}-${item.crated}`;
              previousItems.set(key, item.quantity);
            }
          }

          let totalAdded = 0;
          let totalRemoved = 0;
          const itemChanges: ItemChange[] = [];
          const allKeys = new Set([...currentItems.keys(), ...previousItems.keys()]);

          for (const key of allKeys) {
            const current = currentItems.get(key) || 0;
            const previous = previousItems.get(key) || 0;
            const change = current - previous;
            if (change !== 0) {
              const [itemCode, cratedStr] = key.split("-");
              itemChanges.push({
                itemCode,
                displayName: getItemDisplayName(itemCode),
                change,
                crated: cratedStr === "true",
              });
            }
            if (change > 0) totalAdded += change;
            if (change < 0) totalRemoved += Math.abs(change);
          }

          // Sort item changes by absolute change amount (biggest first)
          itemChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

          activities.push({
            id: `scan-${scan.id}`,
            type: "SCAN",
            userId: scan.scannedBy.id,
            userName: scan.scannedBy.name || "Unknown",
            userAvatar: scan.scannedBy.image,
            timestamp: scan.createdAt.toISOString(),
            scan: {
              stockpileName: scan.stockpile.name,
              stockpileHex: scan.stockpile.hex,
              totalAdded,
              totalRemoved,
              points: totalAdded + totalRemoved,
              itemChanges,
            },
          });
        }
      }
    }

    // Fetch production activities
    if (types.includes("PRODUCTION")) {
      const orders = await prisma.productionOrder.findMany({
        where: { regimentId: user.selectedRegimentId },
        select: { id: true, name: true },
      });
      const orderMap = new Map(orders.map((o) => [o.id, o.name]));
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        const contributions = await prisma.productionContribution.findMany({
          where: { orderId: { in: orderIds } },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        for (const contribution of contributions) {
          activities.push({
            id: `production-${contribution.id}`,
            type: "PRODUCTION",
            userId: contribution.user.id,
            userName: contribution.user.name || "Unknown",
            userAvatar: contribution.user.image,
            timestamp: contribution.createdAt.toISOString(),
            production: {
              orderName: orderMap.get(contribution.orderId) || "Unknown Order",
              itemCode: contribution.itemCode,
              itemName: getItemDisplayName(contribution.itemCode),
              quantity: contribution.quantity,
            },
          });
        }
      }
    }

    // Fetch operation activities (creations and status changes)
    if (types.includes("OPERATION")) {
      const operations = await prisma.operation.findMany({
        where: { regimentId: user.selectedRegimentId },
        include: {
          createdBy: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

      for (const operation of operations) {
        // Determine the action based on status
        let action: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED" = "CREATED";
        let timestamp = operation.createdAt;

        if (operation.status === "ACTIVE") {
          action = "STARTED";
          timestamp = operation.updatedAt;
        } else if (operation.status === "COMPLETED") {
          action = "COMPLETED";
          timestamp = operation.updatedAt;
        } else if (operation.status === "CANCELLED") {
          action = "CANCELLED";
          timestamp = operation.updatedAt;
        }

        activities.push({
          id: `operation-${operation.id}-${action}`,
          type: "OPERATION",
          userId: operation.createdBy.id,
          userName: operation.createdBy.name || "Unknown",
          userAvatar: operation.createdBy.image,
          timestamp: timestamp.toISOString(),
          operation: {
            operationName: operation.name,
            action,
          },
        });
      }
    }

    // Sort all activities by timestamp descending and limit
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}
