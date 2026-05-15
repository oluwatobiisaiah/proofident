import { env } from "./config/env.js";
import { connectRedisIfNeeded } from "./config/redis.js";
import { logger } from "./utils/logger.js";
import { startInlineQueueWorkers } from "./workers/inline-queue-workers.js";

async function start() {
  await connectRedisIfNeeded();
  startInlineQueueWorkers();
  logger.info({ env: env.NODE_ENV }, "worker_process_started");
}

start().catch((err) => {
  console.error("Worker failed to start", err);
  process.exit(1);
});
