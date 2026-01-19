import { Client } from "discord.js";

export function handleReady(client: Client<true>): void {
  console.log(`Discord bot ready! Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s)`);

  // Set bot status
  client.user.setPresence({
    activities: [{ name: "Foxhole logistics", type: 3 }], // type 3 = "Watching"
    status: "online",
  });
}
