import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { getItemDisplayName } from "../utils/items.js";
import { formatRelativeTime, getPriorityLabel, formatDate } from "../utils/formatters.js";

export function registerOperationTools(server: McpServer): void {
  // list_operations - List operations
  server.tool(
    "list_operations",
    "List operations, optionally filtered by status",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
      limit: z.number().optional().default(20),
    },
    async ({ regimentId, status, limit }) => {
      const operations = await prisma.operation.findMany({
        where: {
          regimentId,
          ...(status && { status }),
        },
        include: {
          createdBy: { select: { name: true, discordId: true } },
          requirements: { select: { itemCode: true, quantity: true } },
          destinationStockpile: { select: { name: true, hex: true } },
        },
        orderBy: [
          { scheduledFor: "asc" },
          { createdAt: "desc" },
        ],
        take: limit,
      });

      const result = operations.map((op) => {
        const totalRequirements = op.requirements.reduce((sum, req) => sum + req.quantity, 0);

        return {
          id: op.id,
          name: op.name,
          description: op.description,
          status: op.status,
          location: op.location,
          scheduledFor: op.scheduledFor?.toISOString() || null,
          scheduledForDisplay: op.scheduledFor ? formatDate(op.scheduledFor) : null,
          scheduledEndAt: op.scheduledEndAt?.toISOString() || null,
          createdBy: op.createdBy?.name || "Unknown",
          createdAt: op.createdAt.toISOString(),
          createdRelative: formatRelativeTime(op.createdAt),
          requirementCount: op.requirements.length,
          totalRequiredItems: totalRequirements,
          destinationStockpile: op.destinationStockpile
            ? `${op.destinationStockpile.hex} - ${op.destinationStockpile.name}`
            : null,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              operationCount: result.length,
              operations: result,
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_operation - Get detailed operation info
  server.tool(
    "get_operation",
    "Get detailed operation information including requirements",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      operationId: z.string().describe("Operation ID"),
    },
    async ({ regimentId, operationId }) => {
      const operation = await prisma.operation.findFirst({
        where: { id: operationId, regimentId },
        include: {
          createdBy: { select: { name: true, discordId: true } },
          requirements: { orderBy: { priority: "desc" } },
          destinationStockpile: { select: { id: true, name: true, hex: true, locationName: true } },
        },
      });

      if (!operation) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "Operation not found" }) },
          ],
          isError: true,
        };
      }

      const requirements = operation.requirements.map((req) => ({
        itemCode: req.itemCode,
        displayName: getItemDisplayName(req.itemCode),
        quantity: req.quantity,
        priority: req.priority,
        priorityLabel: getPriorityLabel(req.priority),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: operation.id,
              name: operation.name,
              description: operation.description,
              status: operation.status,
              location: operation.location,
              scheduledFor: operation.scheduledFor?.toISOString() || null,
              scheduledEndAt: operation.scheduledEndAt?.toISOString() || null,
              createdBy: operation.createdBy?.name || "Unknown",
              createdAt: operation.createdAt.toISOString(),
              destinationStockpile: operation.destinationStockpile
                ? {
                    id: operation.destinationStockpile.id,
                    name: operation.destinationStockpile.name,
                    location: `${operation.destinationStockpile.hex} - ${operation.destinationStockpile.locationName}`,
                  }
                : null,
              requirements,
              totalRequiredItems: requirements.reduce((sum, req) => sum + req.quantity, 0),
            }, null, 2),
          },
        ],
      };
    }
  );

  // get_operation_deficit - Get operation requirements with current inventory and deficits
  server.tool(
    "get_operation_deficit",
    "Get operation requirements compared against current inventory to show deficits",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      operationId: z.string().describe("Operation ID"),
    },
    async ({ regimentId, operationId }) => {
      const operation = await prisma.operation.findFirst({
        where: { id: operationId, regimentId },
        include: {
          requirements: { orderBy: { priority: "desc" } },
        },
      });

      if (!operation) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "Operation not found" }) },
          ],
          isError: true,
        };
      }

      // Get aggregate inventory for required items
      const requiredItemCodes = operation.requirements.map((r) => r.itemCode);
      const inventoryItems = await prisma.stockpileItem.groupBy({
        by: ["itemCode"],
        where: {
          stockpile: { regimentId },
          itemCode: { in: requiredItemCodes },
        },
        _sum: { quantity: true },
      });

      const inventoryMap = new Map(
        inventoryItems.map((item) => [item.itemCode, item._sum.quantity || 0])
      );

      const deficitAnalysis = operation.requirements.map((req) => {
        const available = inventoryMap.get(req.itemCode) || 0;
        const deficit = Math.max(0, req.quantity - available);
        const fulfillmentPercent = req.quantity > 0
          ? Math.min(100, Math.round((available / req.quantity) * 100))
          : 100;

        return {
          itemCode: req.itemCode,
          displayName: getItemDisplayName(req.itemCode),
          required: req.quantity,
          available,
          deficit,
          fulfillmentPercent,
          priority: req.priority,
          priorityLabel: getPriorityLabel(req.priority),
          status: deficit === 0 ? "fulfilled" : fulfillmentPercent >= 50 ? "partial" : "critical",
        };
      });

      // Sort by deficit status (critical first) then by priority
      deficitAnalysis.sort((a, b) => {
        const statusOrder = { critical: 0, partial: 1, fulfilled: 2 };
        const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        if (statusDiff !== 0) return statusDiff;
        return b.priority - a.priority;
      });

      const totalRequired = deficitAnalysis.reduce((sum, item) => sum + item.required, 0);
      const totalAvailable = deficitAnalysis.reduce((sum, item) => sum + Math.min(item.available, item.required), 0);
      const totalDeficit = deficitAnalysis.reduce((sum, item) => sum + item.deficit, 0);
      const criticalCount = deficitAnalysis.filter((item) => item.status === "critical").length;
      const partialCount = deficitAnalysis.filter((item) => item.status === "partial").length;
      const fulfilledCount = deficitAnalysis.filter((item) => item.status === "fulfilled").length;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              operationId: operation.id,
              operationName: operation.name,
              status: operation.status,
              summary: {
                totalRequired,
                totalAvailable,
                totalDeficit,
                overallFulfillment: totalRequired > 0
                  ? Math.round((totalAvailable / totalRequired) * 100)
                  : 100,
                criticalCount,
                partialCount,
                fulfilledCount,
              },
              items: deficitAnalysis,
            }, null, 2),
          },
        ],
      };
    }
  );

  // create_operation - Create a new operation
  server.tool(
    "create_operation",
    "Create a new operation with equipment requirements",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      userId: z.string().describe("User ID creating the operation"),
      name: z.string().describe("Operation name"),
      description: z.string().optional(),
      location: z.string().optional().describe("Target hex/location"),
      scheduledFor: z.string().optional().describe("ISO datetime when operation starts"),
      scheduledEndAt: z.string().optional().describe("ISO datetime when operation ends"),
      destinationStockpileId: z.string().optional(),
      requirements: z.array(z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
        priority: z.number().min(0).max(3).optional().default(1),
      })).optional(),
    },
    async ({ regimentId, userId, name, description, location, scheduledFor, scheduledEndAt, destinationStockpileId, requirements }) => {
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

      const operation = await prisma.operation.create({
        data: {
          regimentId,
          name,
          description,
          location,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
          destinationStockpileId,
          createdById: userId,
          ...(requirements && requirements.length > 0 && {
            requirements: {
              create: requirements.map((req) => ({
                itemCode: req.itemCode,
                quantity: req.quantity,
                priority: req.priority ?? 1,
              })),
            },
          }),
        },
        include: {
          requirements: true,
          destinationStockpile: { select: { name: true, hex: true } },
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              operationId: operation.id,
              name: operation.name,
              status: operation.status,
              requirementCount: operation.requirements.length,
              destinationStockpile: operation.destinationStockpile
                ? `${operation.destinationStockpile.hex} - ${operation.destinationStockpile.name}`
                : null,
            }, null, 2),
          },
        ],
      };
    }
  );
}
