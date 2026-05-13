import type { FastifyPluginAsync } from "fastify";
import { scoreService } from "../services/score.service.js";

export const scoreRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/:id/score", async (request, reply) => {
    const params = request.params as { id: string };
    const score = await scoreService.getLatestScore(params.id);
    return reply.send({ score });
  });

  app.get("/users/:id/score/status", async (request, reply) => {
    const params = request.params as { id: string };
    const status = await scoreService.getScoreStatus(params.id);
    return reply.send(status);
  });

  app.post("/users/:id/score/recalculate", async (request, reply) => {
    const params = request.params as { id: string };
    const score = await scoreService.recalculate(params.id);
    return reply.send({ success: true, score });
  });
};
