import { z } from "zod";

const envSchema = z.object({
  // Discord
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),

  // Google AI (Gemini)
  GOOGLE_API_KEY: z.string().min(1),

  // Database (for direct queries if needed)
  DATABASE_URL: z.string().optional(),

  // Scanner service
  SCANNER_URL: z.string().default("http://localhost:8001"),

  // Environment
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  // Debug settings
  DEBUG: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("false"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DEBUG_CATEGORIES: z.string().optional(), // "mcp,gemini,discord,agent,all"
  DEBUG_TRUNCATE: z.coerce.number().default(500), // Max chars for data display
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment configuration:");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

export type Config = z.infer<typeof envSchema>;
