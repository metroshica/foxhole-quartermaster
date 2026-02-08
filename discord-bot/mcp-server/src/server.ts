import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerStatsTools } from "./tools/stats.js";
import { registerInventoryTools } from "./tools/inventory.js";
import { registerStockpileTools } from "./tools/stockpiles.js";
import { registerProductionTools } from "./tools/production.js";
import { registerOperationTools } from "./tools/operations.js";
import { registerScannerTools } from "./tools/scanner.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "foxhole-quartermaster",
    version: "1.0.0",
  });

  // Register all tool modules
  registerStatsTools(server);
  registerInventoryTools(server);
  registerStockpileTools(server);
  registerProductionTools(server);
  registerOperationTools(server);
  registerScannerTools(server);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}
