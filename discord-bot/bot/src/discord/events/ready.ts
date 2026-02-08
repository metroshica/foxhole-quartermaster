import { Client } from "discord.js";
import { logger } from "../../utils/logger.js";

export function handleReady(client: Client<true>): void {
  logger.info(
    "discord",
    `Logged in as ${client.user.tag} (${client.guilds.cache.size} guild${client.guilds.cache.size !== 1 ? "s" : ""})`
  );

  // Set bot status
  client.user.setPresence({
    activities: [{ name: "Foxhole logistics", type: 3 }], // type 3 = "Watching"
    status: "online",
  });
}
