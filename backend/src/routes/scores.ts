import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { scoreService } from "../services/score.service.js";

export const scoreRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me/score", { preHandler: requireAuth }, async (request, reply) => {
    const score = await scoreService.getLatestScore(request.auth!.userId);
    return reply.send({ score });
  });

  app.get("/me/score/status", { preHandler: requireAuth }, async (request, reply) => {
    const status = await scoreService.getScoreStatus(request.auth!.userId);
    return reply.send(status);
  });

  app.post("/me/score/recalculate", { preHandler: requireAuth }, async (request, reply) => {
    const score = await scoreService.recalculate(request.auth!.userId);
    return reply.send({ success: true, score });
  });
};
