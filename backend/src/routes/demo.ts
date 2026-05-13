import type { FastifyPluginAsync } from "fastify";
import { demoService } from "../services/demo.service.js";
import { decisionEngineService } from "../services/decision-engine.service.js";

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.post("/demo/bootstrap", async (_request, reply) => {
    const result = await demoService.bootstrapCanonicalData();

    for (const userId of result.userIds) {
      await decisionEngineService.recalculateScore(userId);
    }

    return reply.send({
      success: true,
      ...result
    });
  });

  app.get("/demo/users/:id/snapshot", async (request, reply) => {
    const params = request.params as { id: string };
    const snapshot = await decisionEngineService.getUserSnapshot(params.id);
    return reply.send(snapshot);
  });
};
