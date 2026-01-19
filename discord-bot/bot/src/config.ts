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
