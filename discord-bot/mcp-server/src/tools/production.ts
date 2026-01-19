import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { getItemDisplayName } from "../utils/items.js";
import { formatRelativeTime, getPriorityLabel, formatDuration } from "../utils/formatters.js";

export function registerProductionTools(server: McpServer): void {
  // list_production_orders - List production orders
  server.tool(
    "list_production_orders",
    "List production orders, optionally filtered by status",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      status: z.enum(["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"]).optional(),
      isMpf: z.boolean().optional().describe("Filter for MPF orders only"),
      limit: z.number().optional().default(20),
    },
    async ({ regimentId, status, isMpf, limit }) => {
      const orders = await prisma.productionOrder.findMany({
        where: {
          regimentId,
          ...(status && { status }),
          ...(isMpf !== undefined && { isMpf }),
        },
        include: {
          items: true,
          createdBy: { select: { name: true, discordId: true } },
          targetStockpiles: {
            include: { stockpile: { select: { name: true, hex: true } } },
          },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
      });

      const result = orders.map((order) => {
        // Calculate progress
        const totalRequired = order.items.reduce((sum, item) => sum + item.quantityRequired, 0);
        const totalProduced = order.items.reduce((sum, item) => sum + item.quantityProduced, 0);
        const progressPercent = totalRequired > 0 ? Math.round((totalProduced / totalRequired) * 100) : 0;

        // MPF timer info
        let mpfStatus: string | null = null;
        let timeRemaining: string | null = null;
        if (order.isMpf && order.mpfReadyAt) {
          const now = new Date();
          if (order.mpfReadyAt > now) {
            mpfStatus = "in_production";
            timeRemaining = formatDuration(order.mpfReadyAt.getTime() - now.getTime());
          } else {
            mpfStatus = "ready";
          }
        }

        return {
          id: order.id,
          shortId: order.shortId,
          name: order.name,
          description: order.description,
          status: order.status,
          priority: order.priority,
          priorityLabel: getPriorityLabel(order.priority),
          isMpf: order.isMpf,
          mpfStatus,
          mpfReadyAt: order.mpfReadyAt?.toISOString() || null,
          timeRemaining,
          createdBy: order.createdBy?.name || "Unknown",
          createdAt: order.createdAt.toISOString(),
          createdRelative: formatRelativeTime(order.createdAt),
          totalRequired,
          totalProduced,
          progressPercent,
          itemCount: order.items.length,
          targetStockpiles: order.targetStockpiles.map((ts) => ({
            id: ts.stockpile.name,
            location: `${ts.stockpile.hex} - ${ts.stockpile.name}`,
          })),
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              orderCount: result.length,
              orders: result,
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_production_order - Get detailed production order
  server.tool(
    "get_production_order",
    "Get detailed production order with all items and progress",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      orderId: z.string().optional().describe("Production order ID"),
      shortId: z.string().optional().describe("Short ID for the order"),
    },
    async ({ regimentId, orderId, shortId }) => {
      if (!orderId && !shortId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Either orderId or shortId is required" }),
            },
          ],
          isError: true,
        };
      }

      const order = await prisma.productionOrder.findFirst({
        where: {
          regimentId,
          ...(orderId && { id: orderId }),
          ...(shortId && { shortId }),
        },
        include: {
          items: { orderBy: { quantityRequired: "desc" } },
          createdBy: { select: { name: true, discordId: true } },
          targetStockpiles: {
            include: { stockpile: { select: { id: true, name: true, hex: true } } },
          },
          deliveryStockpile: { select: { id: true, name: true, hex: true } },
        },
      });

      if (!order) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Production order not found" }),
            },
          ],
          isError: true,
        };
      }

      const items = order.items.map((item) => ({
        itemCode: item.itemCode,
        displayName: getItemDisplayName(item.itemCode),
        quantityRequired: item.quantityRequired,
        quantityProduced: item.quantityProduced,
        remaining: item.quantityRequired - item.quantityProduced,
        progressPercent: Math.round((item.quantityProduced / item.quantityRequired) * 100),
      }));

      const totalRequired = items.reduce((sum, item) => sum + item.quantityRequired, 0);
      const totalProduced = items.reduce((sum, item) => sum + item.quantityProduced, 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: order.id,
              shortId: order.shortId,
              name: order.name,
              description: order.description,
              status: order.status,
              priority: order.priority,
              priorityLabel: getPriorityLabel(order.priority),
              isMpf: order.isMpf,
              mpfSubmittedAt: order.mpfSubmittedAt?.toISOString() || null,
              mpfReadyAt: order.mpfReadyAt?.toISOString() || null,
              createdBy: order.createdBy?.name || "Unknown",
              createdAt: order.createdAt.toISOString(),
              completedAt: order.completedAt?.toISOString() || null,
              deliveredAt: order.deliveredAt?.toISOString() || null,
              deliveryStockpile: order.deliveryStockpile
                ? `${order.deliveryStockpile.hex} - ${order.deliveryStockpile.name}`
                : null,
              totalRequired,
              totalProduced,
              progressPercent: totalRequired > 0 ? Math.round((totalProduced / totalRequired) * 100) : 0,
              items,
              targetStockpiles: order.targetStockpiles.map((ts) => ({
                id: ts.stockpile.id,
                name: ts.stockpile.name,
                location: `${ts.stockpile.hex} - ${ts.stockpile.name}`,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );

  // create_production_order - Create a new production order
  server.tool(
    "create_production_order",
    "Create a new production order",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      userId: z.string().describe("User ID creating the order"),
      name: z.string().describe("Order name"),
      description: z.string().optional(),
      priority: z.number().min(0).max(3).optional().default(1).describe("0=Low, 1=Medium, 2=High, 3=Critical"),
      isMpf: z.boolean().optional().default(false),
      items: z.array(z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
      })).min(1).describe("Items to produce"),
      targetStockpileIds: z.array(z.string()).optional(),
    },
    async ({ regimentId, userId, name, description, priority, isMpf, items, targetStockpileIds }) => {
      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "User not found" }) },
          ],
          isError: true,
        };
      }

      // Create order with items and target stockpiles
      const order = await prisma.productionOrder.create({
        data: {
          regimentId,
          name,
          description,
          priority: priority ?? 1,
          isMpf: isMpf ?? false,
          createdById: userId,
          items: {
            create: items.map((item) => ({
              itemCode: item.itemCode,
              quantityRequired: item.quantity,
            })),
          },
          ...(targetStockpileIds && targetStockpileIds.length > 0 && {
            targetStockpiles: {
              create: targetStockpileIds.map((stockpileId) => ({
                stockpileId,
              })),
            },
          }),
        },
        include: {
          items: true,
          targetStockpiles: {
            include: { stockpile: { select: { name: true, hex: true } } },
          },
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              orderId: order.id,
              shortId: order.shortId,
              name: order.name,
              itemCount: order.items.length,
              totalQuantity: order.items.reduce((sum, item) => sum + item.quantityRequired, 0),
              isMpf: order.isMpf,
              targetStockpiles: order.targetStockpiles.map((ts) => ts.stockpile.name),
            }, null, 2),
          },
        ],
      };
    }
  );

  // update_production_progress - Update quantity produced
  server.tool(
    "update_production_progress",
    "Update quantity produced for items in an order",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      userId: z.string().describe("User ID making the update"),
      orderId: z.string().describe("Production order ID"),
      items: z.array(z.object({
        itemCode: z.string(),
        quantityProduced: z.number().min(0),
      })).min(1),
    },
    async ({ regimentId, orderId, userId, items }) => {
      // Verify order belongs to regiment
      const order = await prisma.productionOrder.findFirst({
        where: { id: orderId, regimentId },
        include: { items: true },
      });

      if (!order) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "Order not found" }) },
          ],
          isError: true,
        };
      }

      // Update each item
      const updates = [];
      for (const update of items) {
        const orderItem = order.items.find((i) => i.itemCode === update.itemCode);
        if (orderItem) {
          const previousQuantity = orderItem.quantityProduced;
          const delta = update.quantityProduced - previousQuantity;

          updates.push(
            prisma.productionOrderItem.update({
              where: { id: orderItem.id },
              data: { quantityProduced: update.quantityProduced },
            })
          );

          // Record contribution if positive delta
          if (delta > 0) {
            updates.push(
              prisma.productionContribution.create({
                data: {
                  orderId,
                  itemCode: update.itemCode,
                  userId,
                  quantity: delta,
                  warNumber: 0, // Would need to track current war number
                },
              })
            );
          }
        }
      }

      await prisma.$transaction(updates);

      // Check if order is complete and update status
      const updatedOrder = await prisma.productionOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (updatedOrder) {
        const allComplete = updatedOrder.items.every(
          (item) => item.quantityProduced >= item.quantityRequired
        );
        const anyStarted = updatedOrder.items.some(
          (item) => item.quantityProduced > 0
        );

        let newStatus = updatedOrder.status;
        if (allComplete && !updatedOrder.isMpf) {
          newStatus = "COMPLETED";
        } else if (anyStarted && updatedOrder.status === "PENDING") {
          newStatus = "IN_PROGRESS";
        }

        if (newStatus !== updatedOrder.status) {
          await prisma.productionOrder.update({
            where: { id: orderId },
            data: {
              status: newStatus,
              ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
            },
          });
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              orderId,
              updatedItems: items.length,
              newStatus: updatedOrder?.status,
            }, null, 2),
          },
        ],
      };
    }
  );
}
