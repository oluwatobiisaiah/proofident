import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { jobService } from "../services/job.service.js";

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me/jobs", { preHandler: requireAuth }, async (request, reply) => {
    const matches = await jobService.getMatches(request.auth!.userId);
    return reply.send({ matches });
  });

  app.get("/me/applications", { preHandler: requireAuth }, async (request, reply) => {
    const applications = await jobService.getApplications(request.auth!.userId);
    return reply.send({ applications });
  });
  app.get("/jobs/:id", async (request, reply) => {
    const params = z.object({ id: z.uuid() }).parse(request.params);
    const job = await jobService.getJob(params.id);
    return reply.send({ job });
  });

  app.post("/jobs/:id/apply", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.uuid() }).parse(request.params);
    const body = z.object({
      needsLoan: z.boolean().default(false)
    }).parse(request.body);
    const application = await jobService.applyToJob(request.auth!.userId, params.id, body.needsLoan);
    return reply.send({ success: true, application });
  });
};
