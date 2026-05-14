import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { bettingProviderCatalogService } from "../services/betting-provider-catalog.service.js";
import { bettingProviderNormalizerService } from "../services/betting-provider-normalizer.service.js";
import { ingestionService } from "../services/ingestion.service.js";
import { userService } from "../services/user.service.js";

export const userRoutes: FastifyPluginAsync = async (app) => {
  const providerCodeSchema = z.enum(["sportybet", "bet9ja", "nairabet", "opay", "palmpay", "moniepoint", "kuda", "sterling", "other"]);
  const authOnly = { preHandler: requireAuth } as const;

  app.get("/me", authOnly, async (request, reply) => {
    const summary = await userService.getSummary(request.auth!.userId);
    return reply.send(summary);
  });

  app.get("/me/timeline", authOnly, async (request, reply) => {
    const events = await userService.getTimeline(request.auth!.userId);
    return reply.send({ userId: request.auth!.userId, events });
  });

  app.get("/me/risk-flags", authOnly, async (request, reply) => {
    const summary = await userService.getSummary(request.auth!.userId);
    return reply.send({ flags: summary.flags });
  });

  app.get("/me/data-sources", authOnly, async (request, reply) => {
    const dataSources = await userService.getDataSources(request.auth!.userId);
    return reply.send({ dataSources });
  });

  app.get("/me/data-sources/betting/providers", authOnly, async (_request, reply) => {
    return reply.send({
      providers: bettingProviderCatalogService.listProviders()
    });
  });

  app.post("/me/data-sources/connect/initiate", authOnly, async (request, reply) => {
    const body = z.object({
      sourceType: z.enum(["mobile_money"]),
      providerCode: providerCodeSchema
    }).parse(request.body);
    const link = await ingestionService.initiateMonoLink(request.auth!.userId, body.sourceType, body.providerCode);
    return reply.send({ success: true, link });
  });

  app.post("/me/data-sources/connect/complete", authOnly, async (request, reply) => {
    const body = z.object({
      sourceType: z.enum(["mobile_money"]),
      providerCode: providerCodeSchema,
      code: z.string().min(4)
    }).parse(request.body);
    const result = await ingestionService.completeMonoLink({
      userId: request.auth!.userId,
      sourceType: body.sourceType,
      providerCode: body.providerCode,
      code: body.code
    });
    return reply.send({ success: true, ...result });
  });

  app.post("/me/data-sources/imports/betting/provider", authOnly, async (request, reply) => {
    const body = z.object({
      providerCode: providerCodeSchema,
      format: z.enum(["csv", "json"]),
      payload: z.union([
        z.string().min(1),
        z.array(z.record(z.string(), z.unknown())).min(1)
      ])
    }).parse(request.body);

    const normalized = bettingProviderNormalizerService.normalizeProviderPayload({
      providerCode: body.providerCode,
      format: body.format,
      payload: body.payload
    });

    const result = await ingestionService.importManualBettingRecords(request.auth!.userId, body.providerCode, normalized);
    return reply.send({ success: true, normalizedRecords: normalized.length, ...result });
  });

  app.post("/me/data-sources/manual-import/betting", authOnly, async (request, reply) => {
    const body = z.object({
      providerCode: providerCodeSchema,
      records: z.array(z.object({
        externalBetId: z.string().optional(),
        providerReference: z.string().optional(),
        transactionDate: z.string(),
        settledAt: z.string().optional(),
        amount: z.number().int().positive(),
        odds: z.number().positive(),
        outcome: z.enum(["win", "loss", "pending"]),
        payout: z.number().int().nonnegative().optional(),
        betType: z.string().optional(),
        league: z.string().optional(),
        rawPayload: z.record(z.string(), z.unknown()).optional()
      })).min(1)
    }).parse(request.body);
    const result = await ingestionService.importManualBettingRecords(request.auth!.userId, body.providerCode, body.records);
    return reply.send({ success: true, ...result });
  });

  app.post("/me/data-sources/manual-import/mobile-money", authOnly, async (request, reply) => {
    const body = z.object({
      providerCode: providerCodeSchema,
      records: z.array(z.object({
        externalTransactionId: z.string().optional(),
        providerReference: z.string().optional(),
        transactionDate: z.string(),
        transactionType: z.enum(["credit", "debit"]),
        transactionStatus: z.enum(["pending", "successful", "failed", "reversed", "cancelled"]).optional(),
        amount: z.number().int().positive(),
        balanceAfter: z.number().int().nonnegative().optional(),
        currency: z.string().length(3).optional(),
        channel: z.string().optional(),
        recipient: z.string().optional(),
        counterpartyName: z.string().optional(),
        counterpartyAccountRef: z.string().optional(),
        merchantCategory: z.string().optional(),
        description: z.string().optional(),
        rawPayload: z.record(z.string(), z.unknown()).optional()
      })).min(1)
    }).parse(request.body);
    const result = await ingestionService.importManualMobileMoneyRecords(request.auth!.userId, body.providerCode, body.records);
    return reply.send({ success: true, ...result });
  });

  app.post("/me/data-sources/:sourceId/sync", authOnly, async (request, reply) => {
    const params = z.object({ sourceId: z.uuid() }).parse(request.params);
    const result = await ingestionService.syncMobileMoneySource(request.auth!.userId, params.sourceId);
    return reply.send({ success: true, ...result });
  });

  app.get("/me/data-sources/:sourceId/ingestion", authOnly, async (request, reply) => {
    const params = z.object({ sourceId: z.uuid() }).parse(request.params);
    const ingestion = await ingestionService.getLatestIngestionForSource(request.auth!.userId, params.sourceId);
    return reply.send({ ingestion });
  });

  app.post("/me/virtual-account", authOnly, async (request, reply) => {
    const account = await userService.provisionVirtualAccount(request.auth!.userId);
    return reply.send({ success: true, account });
  });

  app.post("/me/uploads/presign", authOnly, async (request, reply) => {
    const body = z.object({ sourceType: z.enum(["betting", "mobile_money", "telco", "self_declared"]) }).parse(request.body);
    const upload = await userService.createUploadPresign(request.auth!.userId, body.sourceType);
    return reply.send(upload);
  });

  app.post("/me/ingestions", authOnly, async (request, reply) => {
    const body = z.object({
      sourceType: z.enum(["betting", "mobile_money", "telco", "self_declared"]),
      ingestionMethod: z.enum(["oauth", "manual_upload", "seeded_demo"]),
      dataSourceId: z.string().uuid().optional()
    }).parse(request.body);
    const ingestion = await userService.startIngestion(request.auth!.userId, body.sourceType, body.ingestionMethod, body.dataSourceId);
    return reply.send({ ingestion });
  });

  app.get("/ingestions/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.uuid() }).parse(request.params);
    const ingestion = await userService.getIngestionForUser(request.auth!.userId, params.id);
    return reply.send({ ingestion });
  });
};
