import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { squadService } from "../services/squad.service.js";
import { webhookProcessorService } from "../services/webhook-processor.service.js";

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/squad", async (request, reply) => {
    const signature = request.headers["x-squad-signature"];
    const rawPayload = JSON.stringify(request.body ?? {});

    if (!squadService.verifyWebhookSignature(
      typeof signature === "string" ? signature : undefined,
      rawPayload
    )) {
      return reply.status(401).send({
        error: "Invalid signature"
      });
    }

    const result = await webhookProcessorService.processSquadEvent(request.body as {
      event_id: string;
      type: string;
      data: Record<string, unknown>;
    });

    return reply.send({
      success: true,
      queued: true,
      result
    });
  });

  app.post("/demo/events/:type", async (request, reply) => {
    const params = request.params as { type: string };
    const body = z.object({
      userId: z.uuid(),
      loanId: z.uuid().optional()
    }).parse(request.body);

    const result = await webhookProcessorService.replayCanonicalEvent(params.type, body.userId, body.loanId);
    return reply.send({ success: true, result });
  });
};
