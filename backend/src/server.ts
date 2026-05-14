import { and, eq } from "drizzle-orm";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import { connectRedisIfNeeded, redis } from "./config/redis.js";
import { idempotencyKeys } from "./db/schema/index.js";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./utils/app-error.js";
import { db } from "./config/database.js";
import { logger } from "./utils/logger.js";
import { hashRequest } from "./utils/security.js";
import { ZodError } from "zod";

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true
  }).withTypeProvider<ZodTypeProvider>();

  app.server.requestTimeout = env.REQUEST_TIMEOUT_MS;

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const raw = typeof body === "string" ? body : body.toString("utf8");
    request.rawBody = raw;

    try {
      done(null, raw ? JSON.parse(raw) : {});
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(",")
  });
  await app.register(helmet);

  const redisReady = await connectRedisIfNeeded();
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    ...(redisReady ? { redis } : {})
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!["POST", "PUT", "PATCH"].includes(request.method.toUpperCase())) {
      return;
    }

    const key = request.headers["idempotency-key"];

    if (typeof key !== "string" || !key.trim() || request.url.startsWith("/webhooks/")) {
      return;
    }

    const scope = request.headers.authorization ?? request.ip;
    const requestHash = hashRequest(request.method, request.url, request.body);
    const existing = await db.query.idempotencyKeys.findFirst({
      where: and(
        eq(idempotencyKeys.idempotencyKey, key),
        eq(idempotencyKeys.scope, scope)
      )
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError(409, "Idempotency key was reused with a different request body", "IDEMPOTENCY_MISMATCH");
      }

      if (existing.completedAt) {
        request.idempotency = {
          key,
          recordId: existing.id,
          requestHash,
          replayed: true
        };
        return reply.status(Number(existing.responseStatus ?? 200)).send(existing.responseBody ?? {});
      }

      throw new AppError(409, "A matching request is already being processed", "IDEMPOTENCY_IN_PROGRESS");
    }

    const [created] = await db.insert(idempotencyKeys).values({
      idempotencyKey: key,
      scope,
      requestMethod: request.method.toUpperCase(),
      requestPath: request.url,
      requestHash
    }).returning();

    if (!created) {
      throw new AppError(500, "Failed to persist idempotency key", "IDEMPOTENCY_CREATE_FAILED");
    }

    request.idempotency = {
      key,
      recordId: created.id,
      requestHash,
      replayed: false
    };
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (!request.idempotency || request.idempotency.replayed) {
      return payload;
    }

    let responseBody: unknown = null;
    if (typeof payload === "string" && payload.length > 0) {
      try {
        responseBody = JSON.parse(payload);
      } catch {
        responseBody = payload;
      }
    }

    await db.update(idempotencyKeys).set({
      responseStatus: String(reply.statusCode),
      responseBody,
      completedAt: new Date()
    }).where(eq(idempotencyKeys.id, request.idempotency.recordId));

    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Invalid request payload",
        code: "VALIDATION_ERROR",
        details: error.flatten()
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        details: error.details ?? null
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      error: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR"
    });
  });

  await app.register(registerRoutes);
  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
