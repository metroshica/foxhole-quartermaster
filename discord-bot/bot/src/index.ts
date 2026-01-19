import { initMcpClient, closeMcpClient } from "./mcp/client.js";
import { startBot } from "./discord/client.js";

async function main() {
  console.log("Starting Foxhole Quartermaster Bot...");

  // Initialize MCP client first
  try {
    await initMcpClient();
    console.log("MCP client initialized");
  } catch (error) {
    console.error("Failed to initialize MCP client:", error);
    process.exit(1);
  }

  // Start the Discord bot
  try {
    const client = await startBot();
    console.log("Bot started successfully!");

    // Handle shutdown
    const shutdown = async () => {
      console.log("Shutting down...");
      await closeMcpClient();
      client.destroy();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start bot:", error);
    await closeMcpClient();
    process.exit(1);
  }
}

main();
