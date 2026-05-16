import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { loanService } from "../services/loan.service.js";

export const loanRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me/loan-offers", { preHandler: requireAuth }, async (request, reply) => {
    const offers = await loanService.getLoanOffers(request.auth!.userId);
    return reply.send({ offers });
  });

  app.post("/loans/apply", { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      jobId: z.string(),
      requestedAmount: z.number().int().positive().optional()
    }).parse(request.body);
    const loan = await loanService.applyForLoan(request.auth!.userId, body.jobId, body.requestedAmount);
    return reply.send({ success: true, ...loan });
  });

  app.get("/me/loans", { preHandler: requireAuth }, async (request, reply) => {
    const loans = await loanService.getLoans(request.auth!.userId);
    return reply.send({ loans });
  });

  app.get("/me/income", { preHandler: requireAuth }, async (request, reply) => {
    const income = await loanService.getIncomeRecords(request.auth!.userId);
    return reply.send({ income });
  });
  app.get("/loans/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.uuid() }).parse(request.params);
    const loan = await loanService.getLoan(params.id);
    if (loan.loan.userId !== request.auth!.userId) {
      return reply.status(403).send({
        error: "You cannot access this resource",
        code: "AUTH_FORBIDDEN"
      });
    }
    return reply.send(loan);
  });
};
