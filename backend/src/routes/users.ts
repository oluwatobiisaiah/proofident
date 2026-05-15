import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { bettingIngestionService } from "../services/betting-ingestion.service.js";
import { bettingProviderCatalogService } from "../services/betting-provider-catalog.service.js";
import { bettingProviderNormalizerService } from "../services/betting-provider-normalizer.service.js";
import { ingestionService } from "../services/ingestion.service.js";
import { userService } from "../services/user.service.js";

export const userRoutes: FastifyPluginAsync = async (app) => {
  const providerCodeSchema = z.enum(["sportybet", "bet9ja", "1xbet", "nairabet", "opay", "palmpay", "moniepoint", "kuda", "sterling", "other"]);
  const bettingExtractionProviderSchema = z.enum(["sportybet", "bet9ja", "1xbet"]);
  const authOnly = { preHandler: requireAuth } as const;

  app.get("/me", authOnly, async (request, reply) => {
    const summary = await userService.getSummary(request.auth!.userId);
    return reply.send(summary);
  });

  app.patch("/me", authOnly, async (request, reply) => {
    const body = z.object({
      email: z.string().email().optional(),
      name: z.string().min(2).max(255).optional(),
      state: z.string().min(2).max(50).optional(),
      occupation: z.string().min(1).max(100).optional(),
      monthlyIncome: z.number().int().nonnegative().optional()
    }).parse(request.body);

    const user = await userService.updateProfile(request.auth!.userId, body);
    return reply.send({ success: true, user });
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

  app.post("/me/data-sources/betting/upload-sessions", authOnly, async (request, reply) => {
    const body = z.object({
      providerCode: bettingExtractionProviderSchema,
      uploadKind: z.enum(["screenshot", "csv"]),
      files: z.array(z.object({
        originalFilename: z.string().min(1),
        mimeType: z.string().min(1),
        fileSizeBytes: z.number().int().positive(),
        checksumSha256: z.string().length(64).optional(),
        uploadOrder: z.number().int().nonnegative()
      })).min(1)
    }).parse(request.body);

    const session = await bettingIngestionService.createUploadSession({
      userId: request.auth!.userId,
      providerCode: body.providerCode,
      uploadKind: body.uploadKind,
      files: body.files.map((file) => ({
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
        uploadOrder: file.uploadOrder,
        ...(file.checksumSha256 ? { checksumSha256: file.checksumSha256 } : {})
      }))
    });

    return reply.send({ success: true, ...session });
  });

  app.post("/me/data-sources/betting/upload-sessions/:ingestionSessionId/complete", authOnly, async (request, reply) => {
    const params = z.object({
      ingestionSessionId: z.uuid()
    }).parse(request.params);
    const body = z.object({
      files: z.array(z.object({
        uploadFileId: z.uuid(),
        publicUrl: z.url(),
        storageObjectKey: z.string().min(1),
        mimeType: z.string().optional(),
        fileSizeBytes: z.number().int().positive().optional()
      })).min(1)
    }).parse(request.body);

    const result = await bettingIngestionService.completeUploadSession({
      userId: request.auth!.userId,
      ingestionSessionId: params.ingestionSessionId,
      files: body.files.map((file) => ({
        uploadFileId: file.uploadFileId,
        publicUrl: file.publicUrl,
        storageObjectKey: file.storageObjectKey,
        ...(file.mimeType ? { mimeType: file.mimeType } : {}),
        ...(file.fileSizeBytes ? { fileSizeBytes: file.fileSizeBytes } : {})
      }))
    });

    return reply.send({ success: true, ...result });
  });

  app.get("/me/data-sources/betting/ingestions/:ingestionSessionId/review", authOnly, async (request, reply) => {
    const params = z.object({
      ingestionSessionId: z.uuid()
    }).parse(request.params);

    const reviewSession = await bettingIngestionService.getReviewSession(request.auth!.userId, params.ingestionSessionId);
    return reply.send({ success: true, ...reviewSession });
  });

  app.post("/me/data-sources/betting/ingestions/:ingestionSessionId/review/records/:stagedRecordId", authOnly, async (request, reply) => {
    const params = z.object({
      ingestionSessionId: z.uuid(),
      stagedRecordId: z.uuid()
    }).parse(request.params);
    const body = z.object({
      action: z.enum(["confirm", "edit", "reject"]),
      patch: z.object({
        externalBetId: z.string().nullable().optional(),
        providerReference: z.string().nullable().optional(),
        transactionDate: z.string().nullable().optional(),
        settledAt: z.string().nullable().optional(),
        betAmount: z.number().int().positive().nullable().optional(),
        odds: z.number().positive().nullable().optional(),
        outcome: z.string().nullable().optional(),
        payoutAmount: z.number().int().nonnegative().nullable().optional(),
        betType: z.string().nullable().optional(),
        league: z.string().nullable().optional(),
        eventName: z.string().nullable().optional(),
        reviewerNotes: z.string().nullable().optional()
      }).optional(),
      notes: z.string().max(500).optional()
    }).parse(request.body);

    const record = await bettingIngestionService.reviewRecord({
      userId: request.auth!.userId,
      ingestionSessionId: params.ingestionSessionId,
      stagedRecordId: params.stagedRecordId,
      action: body.action,
      ...(body.patch ? { patch: body.patch } : {}),
      ...(body.notes ? { notes: body.notes } : {})
    });

    return reply.send({ success: true, record });
  });

  app.post("/me/data-sources/betting/ingestions/:ingestionSessionId/review/bulk-confirm", authOnly, async (request, reply) => {
    const params = z.object({
      ingestionSessionId: z.uuid()
    }).parse(request.params);
    const body = z.object({
      stagedRecordIds: z.array(z.uuid()).optional()
    }).parse(request.body ?? {});

    const result = await bettingIngestionService.bulkConfirmRecords({
      userId: request.auth!.userId,
      ingestionSessionId: params.ingestionSessionId,
      ...(body.stagedRecordIds ? { stagedRecordIds: body.stagedRecordIds } : {})
    });

    return reply.send({ success: true, ...result });
  });

  app.post("/me/data-sources/betting/ingestions/:ingestionSessionId/finalize", authOnly, async (request, reply) => {
    const params = z.object({
      ingestionSessionId: z.uuid()
    }).parse(request.params);

    const result = await bettingIngestionService.finalizeConfirmedRecords({
      userId: request.auth!.userId,
      ingestionSessionId: params.ingestionSessionId
    });

    return reply.send({ success: true, ...result });
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

  // Accepts a raw CSV file export from a betting provider.
  // Content-Type: text/csv  (or text/plain)
  // Query param:  ?providerCode=1xbet
  app.post("/me/data-sources/imports/betting/provider", authOnly, async (request, reply) => {
    const query = z.object({ providerCode: bettingExtractionProviderSchema }).parse(request.query);
    const csvText = z.string().min(1, "CSV body is empty").parse(request.body);

    const normalized = bettingProviderNormalizerService.normalizeProviderPayload({
      providerCode: query.providerCode,
      format: "csv",
      payload: csvText
    });

    const result = await ingestionService.importManualBettingRecords(request.auth!.userId, query.providerCode, normalized);
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

  // Direct multipart upload: receives screenshot(s) or a CSV, uploads to Cloudinary, queues ML extraction.
  // Content-Type: multipart/form-data
  // Fields: providerCode (text), uploadKind ("screenshot" | "csv"), file (one or more files)
  app.post("/me/data-sources/betting/upload", authOnly, async (request, reply) => {
    let providerCode: string | undefined;
    let uploadKind: string | undefined;
    const files: Array<{ buffer: Buffer; filename: string; mimeType: string }> = [];

    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (part.fieldname === "providerCode") providerCode = String(part.value);
        if (part.fieldname === "uploadKind") uploadKind = String(part.value);
      } else {
        const buffer = await part.toBuffer();
        files.push({ buffer, filename: part.filename ?? "upload", mimeType: part.mimetype });
      }
    }

    const parsed = z.object({
      providerCode: bettingExtractionProviderSchema,
      uploadKind: z.enum(["screenshot", "csv"])
    }).parse({ providerCode, uploadKind });

    const result = await bettingIngestionService.directUpload({
      userId: request.auth!.userId,
      providerCode: parsed.providerCode,
      uploadKind: parsed.uploadKind,
      files
    });

    return reply.send({ success: true, ...result });
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
