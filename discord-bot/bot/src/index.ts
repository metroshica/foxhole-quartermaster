import { initMcpClient, closeMcpClient } from "./mcp/client.js";
import { startBot } from "./discord/client.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.banner("Quartermaster Discord Bot");
  logger.info("startup", "Bot starting...");

  // Initialize MCP client first
  try {
    await initMcpClient();
  } catch (error) {
    logger.error("startup", "Failed to initialize MCP client", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  // Start the Discord bot
  try {
    const client = await startBot();

    // Handle shutdown
    const shutdown = async () => {
      logger.info("startup", "Shutting down...");
      await closeMcpClient();
      client.destroy();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("startup", "Failed to start bot", {
      error: error instanceof Error ? error.message : String(error),
    });
    await closeMcpClient();
    process.exit(1);
  }
}

main();
