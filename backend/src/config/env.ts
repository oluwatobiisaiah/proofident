import { config } from "dotenv";
import { z } from "zod";

config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  SERVICE_NAME: z.string().default("proofident-backend"),
  SQUAD_SECRET_KEY: z.string().min(1),
  SQUAD_WEBHOOK_SECRET: z.string().min(1),
  TERMII_API_KEY: z.string().min(1),
  TERMII_SENDER_ID: z.string().min(1),
  MONO_SECRET_KEY: z.string().min(1),
  AI_SERVICE_URL: z.url(),
  AI_SERVICE_TOKEN: z.string().min(1),
  FILE_UPLOAD_DIR: z.string().min(1).default("./uploads")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
