import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loanService } from "../services/loan.service.js";

export const loanRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/:id/loan-offers", async (request, reply) => {
    const params = request.params as { id: string };
    const offers = await loanService.getLoanOffers(params.id);
    return reply.send({ offers });
  });

  app.post("/loans/apply", async (request, reply) => {
    const body = z.object({
      userId: z.uuid(),
      jobId: z.uuid(),
      requestedAmount: z.number().int().positive().optional()
    }).parse(request.body);
    const loan = await loanService.applyForLoan(body.userId, body.jobId, body.requestedAmount);
    return reply.send({ success: true, ...loan });
  });

  app.get("/users/:id/loans", async (request, reply) => {
    const params = request.params as { id: string };
    const loans = await loanService.getLoans(params.id);
    return reply.send({ loans });
  });

  app.get("/loans/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const loan = await loanService.getLoan(params.id);
    return reply.send(loan);
  });

  app.get("/users/:id/income", async (request, reply) => {
    const params = request.params as { id: string };
    const loanOffers = await loanService.getLoans(params.id);
    return reply.send({ incomeContext: loanOffers });
  });
};
