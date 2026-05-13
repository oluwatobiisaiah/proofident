import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env.js";
import * as schema from "../db/schema/index.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === "development"
});
