import { config } from "dotenv";
import { z } from "zod";

config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default("proofident"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  SERVICE_NAME: z.string().default("proofident-backend"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(30).default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(0).max(600).default(45),
  ALLOW_DEV_OTP_EXPOSURE: z.coerce.boolean().default(false),
  ENABLE_DEMO_ROUTES: z.coerce.boolean().default(false),
  ENCRYPTION_SECRET: z.string().min(32),
  SQUAD_SECRET_KEY: z.string().min(1),
  SQUAD_BASE_URL: z.url().default("https://sandbox-api-d.squadco.com"),
  SQUAD_MERCHANT_ID: z.string().min(1),
  SQUAD_DEFAULT_BANK_CODE: z.string().default("058"),
  TERMII_API_KEY: z.string().min(1).optional(),
  TERMII_SENDER_ID: z.string().min(1).optional(),
  TERMII_BASE_URL: z.url().default("https://api.ng.termii.com"),
  SMS_PROVIDER: z.enum(["termii", "squad"]).default("squad"),
  SQUAD_SMS_SENDER_ID: z.string().min(1).default("PROOFID"),
  MONO_SECRET_KEY: z.string().min(1),
  MONO_BASE_URL: z.url().default("https://api.withmono.com"),
  MONO_PUBLIC_KEY: z.string().min(1).optional(),
  MONO_REDIRECT_URL: z.url(),
  MONO_WEBHOOK_SECRET: z.string().min(1).optional(),
  MONO_REALTIME_TRANSACTIONS: z.coerce.boolean().default(true),
  AI_SERVICE_URL: z.url(),
  AI_SERVICE_TOKEN: z.string().min(1).optional(),
  FILE_UPLOAD_DIR: z.string().min(1).default("./uploads"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).default("proofident"),
  RUN_INLINE_QUEUE_WORKERS: z.coerce.boolean().default(true)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
