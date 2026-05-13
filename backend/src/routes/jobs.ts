import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { jobService } from "../services/job.service.js";

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/:id/jobs", async (request, reply) => {
    const params = request.params as { id: string };
    const matches = await jobService.getMatches(params.id);
    return reply.send({ matches });
  });

  app.get("/jobs/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const job = await jobService.getJob(params.id);
    return reply.send({ job });
  });

  app.post("/jobs/:id/apply", async (request, reply) => {
    const params = request.params as { id: string };
    const body = z.object({
      userId: z.uuid(),
      needsLoan: z.boolean().default(false)
    }).parse(request.body);
    const application = await jobService.applyToJob(body.userId, params.id, body.needsLoan);
    return reply.send({ success: true, application });
  });

  app.get("/users/:id/applications", async (request, reply) => {
    const params = request.params as { id: string };
    const applications = await jobService.getApplications(params.id);
    return reply.send({ applications });
  });
};
