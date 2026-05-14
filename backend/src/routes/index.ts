import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { authRoutes } from "./auth.js";
import { demoRoutes } from "./demo.js";
import { healthRoutes } from "./health.js";
import { jobRoutes } from "./jobs.js";
import { loanRoutes } from "./loans.js";
import { scoreRoutes } from "./scores.js";
import { userRoutes } from "./users.js";
import { webhookRoutes } from "./webhooks.js";

export const registerRoutes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(scoreRoutes);
  await app.register(jobRoutes);
  await app.register(loanRoutes);
  await app.register(webhookRoutes);

  if (env.ENABLE_DEMO_ROUTES && env.NODE_ENV !== "production") {
    await app.register(demoRoutes);
  }
};
