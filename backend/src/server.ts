import { and, eq } from "drizzle-orm";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
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
import { startInlineQueueWorkers } from "./workers/inline-queue-workers.js";
import { ZodError } from "zod";

function resolveIdempotencyScope(request: { headers: { authorization?: string | undefined }; ip: string }): string {
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const parts = auth.substring(7).split(".");
    if (parts.length === 3 && parts[1]) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as Record<string, unknown>;
        if (typeof payload.sub === "string") return payload.sub;
      } catch {}
    }
    return auth;
  }
  // Unauthenticated: use IP. With trustProxy:true, Fastify reads X-Forwarded-For
  // in production so this is the real client IP, not the server's.
  return request.ip;
}

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

  // Accept raw CSV uploads (used by the provider betting import endpoint)
  app.addContentTypeParser(["text/csv", "text/plain"], { parseAs: "string" }, (_request, body, done) => {
    done(null, typeof body === "string" ? body : body.toString("utf8"));
  });

  await app.register(sensible);
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024, files: 10 }  // 20 MB per file, max 10 files
  });
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

    // Auth routes are time-sensitive (OTP expiry, token issuance) — never cache them
    if (
      typeof key !== "string" ||
      !key.trim() ||
      request.url.startsWith("/webhooks/") ||
      request.url.startsWith("/auth/")
    ) {
      return;
    }

    const scope = resolveIdempotencyScope(request);
    const requestHash = hashRequest(request.method, request.url, request.body);
    const existing = await db.query.idempotencyKeys.findFirst({
      where: and(
        eq(idempotencyKeys.idempotencyKey, key),
        eq(idempotencyKeys.scope, scope)
      )
    });

    if (existing) {
      if (existing.requestHash === requestHash) {
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

      // Different body, same key
      if (!existing.completedAt) {
        // A different request with this key is still in-flight — block
        throw new AppError(409, "A request with this idempotency key is currently being processed", "IDEMPOTENCY_IN_PROGRESS");
      }

      // Previous request completed (success or error). Allow re-use with new body.
      await db.update(idempotencyKeys).set({
        requestHash,
        requestMethod: request.method.toUpperCase(),
        requestPath: request.url,
        responseStatus: null,
        responseBody: null,
        completedAt: null,
        lockedAt: new Date()
      }).where(eq(idempotencyKeys.id, existing.id));

      request.idempotency = { key, recordId: existing.id, requestHash, replayed: false };
      return;
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
  startInlineQueueWorkers();
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
