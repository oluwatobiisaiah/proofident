import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  bettingData,
  bettingExtractionJobs,
  bettingRecordReviews,
  bettingStagedRecords,
  bettingUploadFiles,
  dataSources,
  ingestionSessions
} from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { auditService } from "./audit.service.js";
import { bettingExtractionService } from "./betting-extraction.service.js";
import { bettingFraudService } from "./betting-fraud.service.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { scoreService } from "./score.service.js";

type SupportedBettingProvider = "sportybet" | "bet9ja" | "1xbet";
type UploadKind = "screenshot" | "csv";

type UploadRequestFile = {
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256?: string | undefined;
  uploadOrder: number;
};

type UploadCompletionFile = {
  uploadFileId: string;
  publicUrl: string;
  storageObjectKey: string;
  mimeType?: string | undefined;
  fileSizeBytes?: number | undefined;
};

type ReviewPatch = {
  externalBetId?: string | null | undefined;
  providerReference?: string | null | undefined;
  transactionDate?: string | null | undefined;
  settledAt?: string | null | undefined;
  betAmount?: number | null | undefined;
  odds?: number | null | undefined;
  outcome?: string | null | undefined;
  payoutAmount?: number | null | undefined;
  betType?: string | null | undefined;
  league?: string | null | undefined;
  eventName?: string | null | undefined;
  reviewerNotes?: string | null | undefined;
};

function assertSupportedBettingProvider(providerCode: string): asserts providerCode is SupportedBettingProvider {
  if (!["sportybet", "bet9ja", "1xbet"].includes(providerCode)) {
    throw new AppError(400, "Only Bet9ja, SportyBet, and 1xBet are supported for betting extraction in v1", "BETTING_PROVIDER_UNSUPPORTED");
  }
}

function assertUploadKindAllowed(providerCode: SupportedBettingProvider, uploadKind: UploadKind) {
  if (uploadKind === "csv" && providerCode !== "1xbet") {
    throw new AppError(400, "CSV import is only supported for 1xBet in v1", "BETTING_CSV_PROVIDER_UNSUPPORTED");
  }
}

function parserCodeFor(providerCode: SupportedBettingProvider, uploadKind: UploadKind) {
  if (uploadKind === "csv") return "1xbet_csv_v1";
  if (providerCode === "bet9ja") return "bet9ja_screenshot_v1";
  if (providerCode === "sportybet") return "sportybet_screenshot_v1";
  return "1xbet_screenshot_v1";
}

function countByStatus(records: Array<typeof bettingStagedRecords.$inferSelect>) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.status] = (acc[record.status] ?? 0) + 1;
    return acc;
  }, {});
}

function validateReviewPatch(patch: ReviewPatch) {
  if (patch.betAmount !== undefined && patch.betAmount !== null && (!Number.isInteger(patch.betAmount) || patch.betAmount <= 0)) {
    throw new AppError(400, "betAmount must be a positive integer", "BETTING_REVIEW_INVALID_AMOUNT");
  }
  if (patch.payoutAmount !== undefined && patch.payoutAmount !== null && (!Number.isInteger(patch.payoutAmount) || patch.payoutAmount < 0)) {
    throw new AppError(400, "payoutAmount must be a non-negative integer", "BETTING_REVIEW_INVALID_PAYOUT");
  }
  if (patch.odds !== undefined && patch.odds !== null && patch.odds < 1) {
    throw new AppError(400, "odds must be at least 1", "BETTING_REVIEW_INVALID_ODDS");
  }
  if (patch.transactionDate) {
    const parsed = new Date(patch.transactionDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, "transactionDate must be a valid ISO timestamp", "BETTING_REVIEW_INVALID_DATE");
    }
  }
  if (patch.settledAt) {
    const parsed = new Date(patch.settledAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, "settledAt must be a valid ISO timestamp", "BETTING_REVIEW_INVALID_SETTLED_DATE");
    }
  }
}

async function ensureOwnedSource(userId: string, sourceId: string) {
  const source = await db.query.dataSources.findFirst({
    where: and(eq(dataSources.id, sourceId), eq(dataSources.userId, userId))
  });
  if (!source) {
    throw new AppError(404, "Betting data source not found", "BETTING_DATA_SOURCE_NOT_FOUND");
  }
  return source;
}

async function ensureOwnedSession(userId: string, ingestionSessionId: string) {
  const session = await db.query.ingestionSessions.findFirst({
    where: and(eq(ingestionSessions.id, ingestionSessionId), eq(ingestionSessions.userId, userId))
  });
  if (!session) {
    throw new AppError(404, "Betting ingestion session not found", "BETTING_INGESTION_NOT_FOUND");
  }
  return session;
}

async function ensureOwnedStagedRecord(userId: string, ingestionSessionId: string, stagedRecordId: string) {
  const record = await db.query.bettingStagedRecords.findFirst({
    where: and(
      eq(bettingStagedRecords.id, stagedRecordId),
      eq(bettingStagedRecords.ingestionSessionId, ingestionSessionId),
      eq(bettingStagedRecords.userId, userId)
    )
  });
  if (!record) {
    throw new AppError(404, "Staged betting record not found", "BETTING_STAGED_RECORD_NOT_FOUND");
  }
  return record;
}

async function getOrCreateBettingDataSource(userId: string, providerCode: SupportedBettingProvider) {
  const existing = await db.query.dataSources.findFirst({
    where: and(
      eq(dataSources.userId, userId),
      eq(dataSources.sourceType, "betting"),
      eq(dataSources.providerCode, providerCode),
      eq(dataSources.connectionMethod, "manual_upload")
    )
  });

  if (existing) {
    return existing;
  }

  const [created] = await db.insert(dataSources).values({
    userId,
    sourceType: "betting",
    sourceName: providerCode,
    providerCode,
    connectionMethod: "manual_upload",
    status: "active",
    metadata: {
      importMode: "ocr_or_csv_staged_review"
    }
  }).returning();

  if (!created) {
    throw new AppError(500, "Failed to create betting data source", "BETTING_DATA_SOURCE_CREATE_FAILED");
  }

  return created;
}

export const bettingIngestionService = {
  async createUploadSession(params: {
    userId: string;
    providerCode: SupportedBettingProvider;
    uploadKind: UploadKind;
    files: UploadRequestFile[];
  }) {
    await bettingFraudService.assertUploadAllowed(params.userId);
    assertSupportedBettingProvider(params.providerCode);
    assertUploadKindAllowed(params.providerCode, params.uploadKind);

    if (params.files.length < 1) {
      throw new AppError(400, "At least one file is required", "BETTING_UPLOAD_FILES_REQUIRED");
    }

    const source = await getOrCreateBettingDataSource(params.userId, params.providerCode);
    const [session] = await db.insert(ingestionSessions).values({
      userId: params.userId,
      dataSourceId: source.id,
      sourceType: "betting",
      ingestionMethod: "manual_upload",
      status: "uploaded",
      validationSummary: {
        providerCode: params.providerCode,
        uploadKind: params.uploadKind
      }
    }).returning();

    if (!session) {
      throw new AppError(500, "Failed to create betting ingestion session", "BETTING_INGESTION_CREATE_FAILED");
    }

    const uploadRows = params.files.map((file) => {
      const uploadFileId = randomUUID();
      const intent = cloudinaryService.createSignedUploadIntent({
        userId: params.userId,
        providerCode: params.providerCode,
        ingestionSessionId: session.id,
        uploadFileId,
        originalFilename: file.originalFilename
      });

      return {
        dbRow: {
          id: uploadFileId,
          userId: params.userId,
          dataSourceId: source.id,
          ingestionSessionId: session.id,
          kind: params.uploadKind,
          storageProvider: "cloudinary" as const,
          lifecycleStatus: "initiated" as const,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          storagePath: intent.folder,
          publicUrl: `${intent.uploadUrl}/${intent.publicId}`,
          storageObjectKey: intent.publicId,
          checksumSha256: file.checksumSha256 ?? null,
          fileSizeBytes: file.fileSizeBytes,
          uploadOrder: file.uploadOrder,
          metadata: {
            uploadIntent: {
              folder: intent.folder,
              timestamp: intent.timestamp
            }
          }
        } satisfies typeof bettingUploadFiles.$inferInsert,
        intent: {
          uploadFileId,
          ...intent
        }
      };
    });

    await db.insert(bettingUploadFiles).values(uploadRows.map((row) => row.dbRow));

    await auditService.record({
      actorUserId: params.userId,
      action: "betting.upload_session.created",
      resourceType: "ingestion_session",
      resourceId: session.id,
      status: "success",
      metadata: {
        providerCode: params.providerCode,
        uploadKind: params.uploadKind,
        fileCount: params.files.length
      }
    });

    return {
      dataSourceId: source.id,
      ingestionSessionId: session.id,
      uploadKind: params.uploadKind,
      uploads: uploadRows.map((row) => row.intent)
    };
  },

  async completeUploadSession(params: {
    userId: string;
    ingestionSessionId: string;
    files: UploadCompletionFile[];
  }) {
    const session = await ensureOwnedSession(params.userId, params.ingestionSessionId);
    const source = await ensureOwnedSource(params.userId, session.dataSourceId ?? "");
    const providerCode = source.providerCode ?? "";
    assertSupportedBettingProvider(providerCode);

    const existingFiles = await db.query.bettingUploadFiles.findMany({
      where: eq(bettingUploadFiles.ingestionSessionId, session.id)
    });

    const fileById = new Map(existingFiles.map((file) => [file.id, file]));
    for (const file of params.files) {
      const existing = fileById.get(file.uploadFileId);
      if (!existing) {
        throw new AppError(404, `Upload file ${file.uploadFileId} does not belong to this session`, "BETTING_UPLOAD_FILE_NOT_FOUND");
      }

      await db.update(bettingUploadFiles).set({
        lifecycleStatus: "uploaded",
        publicUrl: file.publicUrl,
        storageObjectKey: file.storageObjectKey,
        mimeType: file.mimeType ?? existing.mimeType,
        fileSizeBytes: file.fileSizeBytes ?? existing.fileSizeBytes,
        metadata: {
          ...(existing.metadata as Record<string, unknown>),
          completedAt: new Date().toISOString()
        }
      }).where(eq(bettingUploadFiles.id, existing.id));
    }

    const uploadKind = existingFiles[0]?.kind ?? "screenshot";
    const [job] = await db.insert(bettingExtractionJobs).values({
      userId: params.userId,
      dataSourceId: source.id,
      ingestionSessionId: session.id,
      status: "queued",
      parserCode: parserCodeFor(providerCode, uploadKind),
      sourceSummary: {
        fileCount: params.files.length,
        uploadKind
      }
    }).returning();

    if (!job) {
      throw new AppError(500, "Failed to create betting extraction job", "BETTING_EXTRACTION_JOB_CREATE_FAILED");
    }

    await db.update(ingestionSessions).set({
      status: "validating",
      validationSummary: {
        ...(session.validationSummary as Record<string, unknown>),
        extractionJobId: job.id,
        queuedAt: new Date().toISOString()
      }
    }).where(eq(ingestionSessions.id, session.id));

    await bettingExtractionService.dispatchExtractionJob(job.id);

    await auditService.record({
      actorUserId: params.userId,
      action: "betting.upload_session.completed",
      resourceType: "ingestion_session",
      resourceId: session.id,
      status: "success",
      metadata: {
        extractionJobId: job.id,
        queued: true
      }
    });

    return {
      ingestionSessionId: session.id,
      extractionJobId: job.id,
      queued: true as const
    };
  },

  async getReviewSession(userId: string, ingestionSessionId: string) {
    const session = await ensureOwnedSession(userId, ingestionSessionId);
    const [source, uploads, extractionJobs, records] = await Promise.all([
      ensureOwnedSource(userId, session.dataSourceId ?? ""),
      db.query.bettingUploadFiles.findMany({
        where: eq(bettingUploadFiles.ingestionSessionId, ingestionSessionId),
        orderBy: [asc(bettingUploadFiles.uploadOrder)]
      }),
      db.query.bettingExtractionJobs.findMany({
        where: eq(bettingExtractionJobs.ingestionSessionId, ingestionSessionId),
        orderBy: [desc(bettingExtractionJobs.createdAt)]
      }),
      db.query.bettingStagedRecords.findMany({
        where: eq(bettingStagedRecords.ingestionSessionId, ingestionSessionId),
        orderBy: [desc(bettingStagedRecords.createdAt)]
      })
    ]);

    return {
      ingestionSession: session,
      dataSource: source,
      uploads,
      extractionJobs,
      summary: {
        totalRecords: records.length,
        statusBreakdown: countByStatus(records),
        readyToConfirmCount: records.filter((record) => record.status === "confirmed").length,
        pendingReviewCount: records.filter((record) => record.status === "pending_review").length
      },
      records
    };
  },

  async reviewRecord(params: {
    userId: string;
    ingestionSessionId: string;
    stagedRecordId: string;
    action: "confirm" | "edit" | "reject";
    patch?: ReviewPatch | undefined;
    notes?: string | undefined;
  }) {
    await ensureOwnedSession(params.userId, params.ingestionSessionId);
    const record = await ensureOwnedStagedRecord(params.userId, params.ingestionSessionId, params.stagedRecordId);
    const patch = params.patch ?? {};
    validateReviewPatch(patch);

    const updatePayload: Partial<typeof bettingStagedRecords.$inferInsert> = {
      reviewerNotes: params.notes ?? patch.reviewerNotes ?? record.reviewerNotes
    };

    if (params.action === "edit" || params.action === "confirm") {
      if (patch.externalBetId !== undefined) updatePayload.externalBetId = patch.externalBetId;
      if (patch.providerReference !== undefined) updatePayload.providerReference = patch.providerReference;
      if (patch.transactionDate !== undefined) updatePayload.transactionDate = patch.transactionDate ? new Date(patch.transactionDate) : null;
      if (patch.settledAt !== undefined) updatePayload.settledAt = patch.settledAt ? new Date(patch.settledAt) : null;
      if (patch.betAmount !== undefined) updatePayload.betAmount = patch.betAmount;
      if (patch.odds !== undefined) updatePayload.odds = patch.odds !== null ? patch.odds.toFixed(2) : null;
      if (patch.outcome !== undefined) updatePayload.outcome = patch.outcome;
      if (patch.payoutAmount !== undefined) updatePayload.payoutAmount = patch.payoutAmount;
      if (patch.betType !== undefined) updatePayload.betType = patch.betType;
      if (patch.league !== undefined) updatePayload.league = patch.league;
      if (patch.eventName !== undefined) updatePayload.eventName = patch.eventName;
      updatePayload.status = "confirmed";
    }

    if (params.action === "reject") {
      updatePayload.status = "rejected";
    }

    const [updated] = await db.update(bettingStagedRecords).set(updatePayload).where(eq(bettingStagedRecords.id, record.id)).returning();
    if (!updated) {
      throw new AppError(500, "Failed to update staged betting record", "BETTING_STAGED_RECORD_UPDATE_FAILED");
    }

    await db.insert(bettingRecordReviews).values({
      stagedRecordId: record.id,
      actorUserId: params.userId,
      action: params.action,
      previousStatus: record.status,
      nextStatus: updated.status,
      patch,
      notes: params.notes ?? null
    });

    return updated;
  },

  async bulkConfirmRecords(params: {
    userId: string;
    ingestionSessionId: string;
    stagedRecordIds?: string[] | undefined;
  }) {
    await ensureOwnedSession(params.userId, params.ingestionSessionId);
    const records = await db.query.bettingStagedRecords.findMany({
      where: eq(bettingStagedRecords.ingestionSessionId, params.ingestionSessionId)
    });

    const targets = records.filter((record) => {
      if (record.status !== "pending_review") return false;
      if (Array.isArray(params.stagedRecordIds) && params.stagedRecordIds.length > 0 && !params.stagedRecordIds.includes(record.id)) {
        return false;
      }
      return Array.isArray(record.validationIssues) ? record.validationIssues.length === 0 : false;
    });

    if (targets.length === 0) {
      return { updatedCount: 0 };
    }

    await db.update(bettingStagedRecords).set({
      status: "confirmed"
    }).where(inArray(bettingStagedRecords.id, targets.map((record) => record.id)));

    await db.insert(bettingRecordReviews).values(
      targets.map((record) => ({
        stagedRecordId: record.id,
        actorUserId: params.userId,
        action: "bulk_confirm" as const,
        previousStatus: record.status,
        nextStatus: "confirmed",
        patch: {},
        notes: null
      }))
    );

    return { updatedCount: targets.length };
  },

  async directUpload(params: {
    userId: string;
    providerCode: SupportedBettingProvider;
    uploadKind: UploadKind;
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>;
  }) {
    await bettingFraudService.assertUploadAllowed(params.userId);
    assertSupportedBettingProvider(params.providerCode);
    assertUploadKindAllowed(params.providerCode, params.uploadKind);

    if (params.files.length === 0) {
      throw new AppError(400, "At least one file is required", "BETTING_UPLOAD_FILES_REQUIRED");
    }

    const source = await getOrCreateBettingDataSource(params.userId, params.providerCode);

    const [session] = await db.insert(ingestionSessions).values({
      userId: params.userId,
      dataSourceId: source.id,
      sourceType: "betting",
      ingestionMethod: "manual_upload",
      status: "uploaded",
      validationSummary: { providerCode: params.providerCode, uploadKind: params.uploadKind }
    }).returning();

    if (!session) {
      throw new AppError(500, "Failed to create betting ingestion session", "BETTING_INGESTION_CREATE_FAILED");
    }

    for (let i = 0; i < params.files.length; i++) {
      const file = params.files[i]!;
      const uploadFileId = randomUUID();

      const uploaded = await cloudinaryService.uploadBuffer({
        buffer: file.buffer,
        mimeType: file.mimeType,
        originalFilename: file.filename,
        userId: params.userId,
        providerCode: params.providerCode,
        ingestionSessionId: session.id,
        uploadFileId
      });

      await db.insert(bettingUploadFiles).values({
        id: uploadFileId,
        userId: params.userId,
        dataSourceId: source.id,
        ingestionSessionId: session.id,
        kind: params.uploadKind,
        storageProvider: "cloudinary",
        lifecycleStatus: "uploaded",
        originalFilename: file.filename,
        mimeType: file.mimeType,
        storagePath: uploaded.folder,
        publicUrl: uploaded.publicUrl,
        storageObjectKey: uploaded.storageObjectKey,
        fileSizeBytes: uploaded.fileSizeBytes,
        uploadOrder: i,
        metadata: { uploadedAt: new Date().toISOString() }
      });
    }

    const [job] = await db.insert(bettingExtractionJobs).values({
      userId: params.userId,
      dataSourceId: source.id,
      ingestionSessionId: session.id,
      status: "queued",
      parserCode: parserCodeFor(params.providerCode, params.uploadKind),
      sourceSummary: { fileCount: params.files.length, uploadKind: params.uploadKind }
    }).returning();

    if (!job) {
      throw new AppError(500, "Failed to create extraction job", "BETTING_EXTRACTION_JOB_CREATE_FAILED");
    }

    await db.update(ingestionSessions).set({
      status: "validating",
      validationSummary: {
        providerCode: params.providerCode,
        uploadKind: params.uploadKind,
        extractionJobId: job.id,
        queuedAt: new Date().toISOString()
      }
    }).where(eq(ingestionSessions.id, session.id));

    await bettingExtractionService.dispatchExtractionJob(job.id);

    await auditService.record({
      actorUserId: params.userId,
      action: "betting.upload_session.created",
      resourceType: "ingestion_session",
      resourceId: session.id,
      status: "success",
      metadata: { providerCode: params.providerCode, uploadKind: params.uploadKind, fileCount: params.files.length }
    });

    return {
      dataSourceId: source.id,
      ingestionSessionId: session.id,
      extractionJobId: job.id,
      filesUploaded: params.files.length
    };
  },

  async finalizeConfirmedRecords(params: {
    userId: string;
    ingestionSessionId: string;
  }) {
    const session = await ensureOwnedSession(params.userId, params.ingestionSessionId);
    const source = await ensureOwnedSource(params.userId, session.dataSourceId ?? "");
    const confirmedRecords = await db.query.bettingStagedRecords.findMany({
      where: and(
        eq(bettingStagedRecords.ingestionSessionId, params.ingestionSessionId),
        eq(bettingStagedRecords.status, "confirmed")
      )
    });

    if (confirmedRecords.length === 0) {
      throw new AppError(400, "No confirmed betting records are available to import", "BETTING_NO_CONFIRMED_RECORDS");
    }

    const existingCanonical = await db.query.bettingData.findMany({
      where: and(eq(bettingData.userId, params.userId), eq(bettingData.dataSourceId, source.id))
    });
    const existingKeys = new Set(
      existingCanonical.map((record) => [
        record.externalBetId ?? "",
        record.providerReference ?? "",
        record.transactionDate.toISOString(),
        record.betAmount
      ].join("|"))
    );

    const toInsert = confirmedRecords.filter((record) => {
      const key = [
        record.externalBetId ?? "",
        record.providerReference ?? "",
        record.transactionDate?.toISOString() ?? "",
        record.betAmount ?? ""
      ].join("|");
      return !existingKeys.has(key);
    });

    if (toInsert.length > 0) {
      await db.insert(bettingData).values(
        toInsert.map((record) => ({
          userId: params.userId,
          dataSourceId: source.id,
          externalBetId: record.externalBetId,
          providerReference: record.providerReference,
          transactionDate: record.transactionDate ?? new Date(),
          settledAt: record.settledAt,
          betAmount: record.betAmount ?? 0,
          odds: Number(record.odds ?? "0").toFixed(2),
          outcome: record.outcome ?? "pending",
          payoutAmount: record.payoutAmount,
          betType: record.betType,
          league: record.league,
          rawPayload: JSON.stringify(record.rawExtractionPayload)
        }))
      );
    }

    await db.update(bettingStagedRecords).set({
      status: "imported",
      importedAt: new Date()
    }).where(inArray(bettingStagedRecords.id, confirmedRecords.map((record) => record.id)));

    await db.update(ingestionSessions).set({
      status: "ready_for_scoring",
      recordCount: confirmedRecords.length,
      acceptedCount: toInsert.length,
      rejectedCount: 0,
      completedAt: new Date(),
      validationSummary: {
        ...(session.validationSummary as Record<string, unknown>),
        importedRecordCount: toInsert.length,
        duplicateCanonicalRecordCount: confirmedRecords.length - toInsert.length
      }
    }).where(eq(ingestionSessions.id, session.id));

    const scoreDispatch = await scoreService.recalculateAsync(params.userId, {
      trigger: "betting_ingestion_confirmed",
      ingestionSessionId: session.id,
      sourceType: "betting"
    });

    await auditService.record({
      actorUserId: params.userId,
      action: "betting.ingestion.finalized",
      resourceType: "ingestion_session",
      resourceId: session.id,
      status: "success",
      metadata: {
        importedRecordCount: toInsert.length,
        scoreQueued: scoreDispatch.queued
      }
    });

    return {
      ingestionSessionId: session.id,
      importedRecordCount: toInsert.length,
      duplicateCanonicalRecordCount: confirmedRecords.length - toInsert.length,
      scoreDispatch
    };
  }
};
