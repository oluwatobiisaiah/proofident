import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { decisionEngineService } from "../services/decision-engine.service.js";
import { demoService } from "../services/demo.service.js";

const authOnly = { preHandler: requireAuth } as const;

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.post("/demo/bootstrap", authOnly, async (_request, reply) => {
    const result = await demoService.bootstrapCanonicalData();

    for (const userId of result.userIds) {
      await decisionEngineService.recalculateScore(userId);
    }

    return reply.send({
      success: true,
      ...result
    });
  });

  app.get("/demo/users/:id/snapshot", authOnly, async (request, reply) => {
    const params = z.object({ id: z.uuid() }).parse(request.params);
    const snapshot = await decisionEngineService.getUserSnapshot(params.id);
    return reply.send(snapshot);
  });
};
