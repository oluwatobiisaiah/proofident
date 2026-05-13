import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true
});

export async function connectRedisIfNeeded() {
  if (redis.status === "ready" || redis.status === "connecting") {
    return true;
  }

  try {
    await redis.connect();
    return true;
  } catch {
    return false;
  }
}
