import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { config } from "../config.js";
import { getMcpClient } from "../mcp/client.js";

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);

// Define function declarations for Gemini based on MCP tools
const functionDeclarations = [
  {
    name: "get_dashboard_stats",
    description: "Get regiment overview: stockpile count, total items, active operations, production orders",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "search_inventory",
    description: "Search regiment inventory for items by name, code, or slang (e.g., '12.7', 'mammon', 'bmat')",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        query: {
          type: SchemaType.STRING,
          description: "Search term (item name, code, or slang)",
        },
        category: {
          type: SchemaType.STRING,
          description: "Optional category filter: 'vehicles', 'weapons', 'ammo', 'resources', 'all'",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max items to return (default 20)",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "get_item_locations",
    description: "Get list of stockpiles containing a specific item with quantities",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        itemCode: {
          type: SchemaType.STRING,
          description: "Item code to search for (e.g., 'RifleC', 'HEGrenade', 'MGAmmo')",
        },
      },
      required: ["regimentId", "itemCode"],
    },
  },
  {
    name: "list_stockpiles",
    description: "List all stockpiles with last scan times, item counts, and freshness status",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        hex: {
          type: SchemaType.STRING,
          description: "Filter by hex/region name",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "get_stockpile",
    description: "Get detailed stockpile information including full inventory",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        stockpileId: {
          type: SchemaType.STRING,
          description: "Stockpile ID",
        },
        stockpileName: {
          type: SchemaType.STRING,
          description: "Stockpile name (partial match)",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "list_production_orders",
    description: "List production orders, optionally filtered by status",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        status: {
          type: SchemaType.STRING,
          description: "Filter by status: PENDING, IN_PROGRESS, READY_FOR_PICKUP, COMPLETED, CANCELLED",
        },
        isMpf: {
          type: SchemaType.BOOLEAN,
          description: "Filter for MPF orders only",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max orders to return (default 20)",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "get_production_order",
    description: "Get detailed production order with all items and progress",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        orderId: {
          type: SchemaType.STRING,
          description: "Production order ID",
        },
        shortId: {
          type: SchemaType.STRING,
          description: "Short ID for the order",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "list_operations",
    description: "List operations, optionally filtered by status",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        status: {
          type: SchemaType.STRING,
          description: "Filter by status: PLANNING, ACTIVE, COMPLETED, CANCELLED",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max operations to return (default 20)",
        },
      },
      required: ["regimentId"],
    },
  },
  {
    name: "get_operation",
    description: "Get detailed operation information including requirements",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        operationId: {
          type: SchemaType.STRING,
          description: "Operation ID",
        },
      },
      required: ["regimentId", "operationId"],
    },
  },
  {
    name: "get_operation_deficit",
    description: "Get operation requirements compared against current inventory to show deficits",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        operationId: {
          type: SchemaType.STRING,
          description: "Operation ID",
        },
      },
      required: ["regimentId", "operationId"],
    },
  },
  {
    name: "get_leaderboard",
    description: "Get contributor leaderboard for scans and production",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        regimentId: {
          type: SchemaType.STRING,
          description: "Discord guild ID of the regiment",
        },
        period: {
          type: SchemaType.STRING,
          description: "Time period: weekly, monthly, war",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max contributors to return (default 10)",
        },
      },
      required: ["regimentId"],
    },
  },
];

export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ functionDeclarations: functionDeclarations as any }],
  });
}

import { logger } from "../utils/logger.js";

export async function executeFunctionCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    const mcp = getMcpClient();
    const result = await mcp.callTool(name, args);

    const content = result.content[0];
    if (content.type === "text" && content.text) {
      return content.text;
    }

    return JSON.stringify(result);
  } catch (error) {
    logger.error("gemini", `Error executing function ${name}`, {
      error: error instanceof Error ? error.message : String(error),
      args,
    });
    return JSON.stringify({ error: `Failed to execute ${name}: ${error}` });
  }
}
