import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { userService } from "../services/user.service.js";

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const summary = await userService.getSummary(params.id);
    return reply.send(summary);
  });

  app.get("/users/:id/timeline", async (request, reply) => {
    const params = request.params as { id: string };
    const events = await userService.getTimeline(params.id);
    return reply.send({ userId: params.id, events });
  });

  app.get("/users/:id/risk-flags", async (request, reply) => {
    const params = request.params as { id: string };
    const summary = await userService.getSummary(params.id);
    return reply.send({ flags: summary.flags });
  });

  app.get("/users/:id/data-sources", async (request, reply) => {
    const params = request.params as { id: string };
    const dataSources = await userService.getDataSources(params.id);
    return reply.send({ dataSources });
  });

  app.post("/users/:id/uploads/presign", async (request, reply) => {
    const params = request.params as { id: string };
    const body = z.object({ sourceType: z.enum(["betting", "mobile_money", "telco", "self_declared"]) }).parse(request.body);
    const upload = await userService.createUploadPresign(params.id, body.sourceType);
    return reply.send(upload);
  });

  app.post("/users/:id/ingestions", async (request, reply) => {
    const params = request.params as { id: string };
    const body = z.object({
      sourceType: z.enum(["betting", "mobile_money", "telco", "self_declared"]),
      ingestionMethod: z.enum(["oauth", "manual_upload", "seeded_demo"]),
      dataSourceId: z.string().uuid().optional()
    }).parse(request.body);
    const ingestion = await userService.startIngestion(params.id, body.sourceType, body.ingestionMethod, body.dataSourceId);
    return reply.send({ ingestion });
  });

  app.get("/ingestions/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const ingestion = await userService.getIngestion(params.id);
    return reply.send({ ingestion });
  });
};
