import { startServer } from "./server.js";

// Start the MCP server
startServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
