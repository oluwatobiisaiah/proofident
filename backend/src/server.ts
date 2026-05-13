import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import { connectRedisIfNeeded, redis } from "./config/redis.js";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./utils/app-error.js";
import { logger } from "./utils/logger.js";

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code
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
