import { sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { db } from "../config/database.js";
import { connectRedisIfNeeded, redis } from "../config/redis.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_request, reply) => {
    const startedAt = Date.now();

    const [database, redisReady] = await Promise.allSettled([
      db.execute(sql`select 1`),
      (async () => {
        await connectRedisIfNeeded();
        return redis.ping();
      })()
    ]);

    const healthy = database.status === "fulfilled" && redisReady.status === "fulfilled";

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? "ok" : "degraded",
      service: "proofident-backend",
      latencyMs: Date.now() - startedAt,
      checks: {
        database: database.status === "fulfilled" ? "ok" : "error",
        redis: redisReady.status === "fulfilled" ? "ok" : "error"
      }
    });
  });
};
