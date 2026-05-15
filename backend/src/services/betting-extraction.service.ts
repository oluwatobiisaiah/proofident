import { eq, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import { bettingExtractionQueue } from "../config/queue.js";
import {
  bettingExtractionJobs,
  bettingRecordReviews,
  bettingStagedRecords,
  bettingUploadFiles,
  dataSources,
  ingestionSessions
} from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { hashValue } from "../utils/security.js";
import { logger } from "../utils/logger.js";
import { bettingFraudService } from "./betting-fraud.service.js";

type SupportedBettingProvider = "sportybet" | "bet9ja" | "1xbet";
type UploadKind = "screenshot" | "csv";

type ExtractionRequestFile = {
  upload_file_id: string;
  public_url: string;
  mime_type: string;
  original_filename: string;
  checksum_sha256?: string | undefined;
  upload_order: number;
  metadata: Record<string, unknown>;
};

export type BettingExtractionRequestJob = {
  job_id: string;
  extraction_job_id: string;
  ingestion_session_id: string;
  data_source_id: string;
  user_id: string;
  provider_code: SupportedBettingProvider;
  upload_kind: UploadKind;
  files: ExtractionRequestFile[];
  created_at: string;
};

type ExtractionResultRow = {
  upload_file_id?: string | undefined;
  external_bet_id?: string | undefined;
  provider_reference?: string | undefined;
  transaction_date?: string | undefined;
  settled_at?: string | undefined;
  bet_amount?: number | undefined;
  odds?: number | undefined;
  outcome?: string | undefined;
  payout_amount?: number | undefined;
  bet_type?: string | undefined;
  league?: string | undefined;
  event_name?: string | undefined;
  extraction_confidence: number;
  parser_code: string;
  validation_issues: string[];
  raw_extraction_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
};

export type BettingExtractionResultJob = {
  job_id: string;
  extraction_job_id: string;
  ingestion_session_id: string;
  data_source_id: string;
  user_id: string;
  provider_code: SupportedBettingProvider;
  upload_kind: UploadKind;
  status: "success" | "failed";
  parser_code: string;
  ocr_provider?: string | null | undefined;
  summary: {
    upload_count: number;
    extracted_record_count: number;
    review_required_count: number;
    rejected_record_count: number;
    average_confidence: number;
    source_breakdown?: Record<string, number> | undefined;
    authenticity: {
      decision: "pass" | "review" | "fail";
      score: number;
      reasons: string[];
      suspected_ai_generated: boolean;
      suspected_tampering: boolean;
      suspected_non_screenshot: boolean;
    };
    file_analyses?: Array<Record<string, unknown>> | undefined;
  };
  rows: ExtractionResultRow[];
  error?: string | null | undefined;
  completed_at: string;
};

function assertSupportedProvider(value: string | null | undefined): asserts value is SupportedBettingProvider {
  if (!value || !["sportybet", "bet9ja", "1xbet"].includes(value)) {
    throw new AppError(400, "Unsupported betting provider for extraction", "BETTING_PROVIDER_UNSUPPORTED");
  }
}

function buildFingerprint(row: ExtractionResultRow, sessionId: string) {
  const parts = [
    sessionId,
    row.external_bet_id ?? "",
    row.provider_reference ?? "",
    row.transaction_date ?? "",
    String(row.bet_amount ?? ""),
    String(row.odds ?? ""),
    row.outcome ?? "",
    row.event_name ?? ""
  ];
  return hashValue(parts.join("|"), "betting-staged-record");
}

async function clearExistingStagedRecords(ingestionSessionId: string) {
  const existingRecords = await db.query.bettingStagedRecords.findMany({
    where: eq(bettingStagedRecords.ingestionSessionId, ingestionSessionId),
    columns: { id: true }
  });

  if (existingRecords.length > 0) {
    await db.delete(bettingRecordReviews).where(
      inArray(
        bettingRecordReviews.stagedRecordId,
        existingRecords.map((record) => record.id)
      )
    );
  }

  await db.delete(bettingStagedRecords).where(eq(bettingStagedRecords.ingestionSessionId, ingestionSessionId));
}

export const bettingExtractionService = {
  async dispatchExtractionJob(extractionJobId: string) {
    const job = await db.query.bettingExtractionJobs.findFirst({
      where: eq(bettingExtractionJobs.id, extractionJobId)
    });

    if (!job) {
      throw new AppError(404, "Extraction job not found", "BETTING_EXTRACTION_JOB_NOT_FOUND");
    }

    const [session, source, uploads] = await Promise.all([
      db.query.ingestionSessions.findFirst({
        where: eq(ingestionSessions.id, job.ingestionSessionId)
      }),
      db.query.dataSources.findFirst({
        where: eq(dataSources.id, job.dataSourceId)
      }),
      db.query.bettingUploadFiles.findMany({
        where: eq(bettingUploadFiles.ingestionSessionId, job.ingestionSessionId)
      })
    ]);

    if (!session || !source) {
      throw new AppError(404, "Extraction job is missing ingestion context", "BETTING_EXTRACTION_CONTEXT_MISSING");
    }

    assertSupportedProvider(source.providerCode);
    const uploadKind = (uploads[0]?.kind ?? "screenshot") as UploadKind;

    const payload: BettingExtractionRequestJob = {
      job_id: extractionJobId,
      extraction_job_id: extractionJobId,
      ingestion_session_id: session.id,
      data_source_id: source.id,
      user_id: source.userId,
      provider_code: source.providerCode,
      upload_kind: uploadKind,
      files: uploads.map((upload) => ({
        upload_file_id: upload.id,
        public_url: upload.publicUrl,
        mime_type: upload.mimeType,
        original_filename: upload.originalFilename,
        upload_order: upload.uploadOrder,
        metadata: upload.metadata as Record<string, unknown>,
        ...(upload.checksumSha256 ? { checksum_sha256: upload.checksumSha256 } : {})
      })),
      created_at: new Date().toISOString()
    };

    await db.update(bettingExtractionJobs).set({
      status: "queued",
      errorMessage: null,
      sourceSummary: {
        uploadCount: uploads.length,
        providerCode: source.providerCode,
        uploadKind
      }
    }).where(eq(bettingExtractionJobs.id, extractionJobId));

    await db.update(ingestionSessions).set({
      status: "validating",
      errorMessage: null,
      validationSummary: {
        ...(session.validationSummary as Record<string, unknown>),
        extractionJobId,
        queueDispatchAt: new Date().toISOString()
      }
    }).where(eq(ingestionSessions.id, session.id));

    await db.update(bettingUploadFiles).set({
      lifecycleStatus: "processing"
    }).where(eq(bettingUploadFiles.ingestionSessionId, session.id));

    await bettingExtractionQueue.add("betting-extraction", payload, {
      jobId: extractionJobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    });

    return payload;
  },

  async applyExtractionResult(result: BettingExtractionResultJob) {
    const job = await db.query.bettingExtractionJobs.findFirst({
      where: eq(bettingExtractionJobs.id, result.extraction_job_id)
    });

    if (!job) {
      throw new AppError(404, "Extraction job not found for result", "BETTING_EXTRACTION_JOB_NOT_FOUND");
    }

    const session = await db.query.ingestionSessions.findFirst({
      where: eq(ingestionSessions.id, result.ingestion_session_id)
    });

    if (!session) {
      throw new AppError(404, "Ingestion session not found for extraction result", "BETTING_INGESTION_NOT_FOUND");
    }

    if (result.status === "failed") {
      await db.update(bettingExtractionJobs).set({
        status: "failed",
        parserCode: result.parser_code,
        ocrProvider: result.ocr_provider ?? null,
        sourceSummary: {
          uploadCount: result.summary.upload_count,
          providerCode: result.provider_code,
          uploadKind: result.upload_kind
        },
        averageConfidence: result.summary.average_confidence.toFixed(4),
        extractedRecordCount: result.summary.extracted_record_count,
        acceptedRecordCount: 0,
        rejectedRecordCount: result.summary.rejected_record_count,
        reviewRequiredCount: result.summary.review_required_count,
        errorMessage: result.error ?? "Extraction failed in ML service",
        processingCompletedAt: new Date(result.completed_at)
      }).where(eq(bettingExtractionJobs.id, result.extraction_job_id));

      await db.update(ingestionSessions).set({
        status: "failed",
        completedAt: new Date(result.completed_at),
        errorMessage: result.error ?? "Extraction failed in ML service",
        validationSummary: {
          ...(session.validationSummary as Record<string, unknown>),
          mlResultReceivedAt: new Date().toISOString(),
          mlStatus: result.status,
          authenticity: result.summary.authenticity,
          sourceBreakdown: result.summary.source_breakdown ?? {}
        }
      }).where(eq(ingestionSessions.id, session.id));

      await db.update(bettingUploadFiles).set({
        lifecycleStatus: "failed"
      }).where(eq(bettingUploadFiles.ingestionSessionId, session.id));

      return;
    }

    const fraudOutcome = await bettingFraudService.handleExtractionFraudResult({
      userId: result.user_id,
      ingestionSessionId: result.ingestion_session_id,
      extractionJobId: result.extraction_job_id,
      fraudSignal: result.summary.authenticity,
      sourceSummary: {
        sourceBreakdown: result.summary.source_breakdown ?? {},
        fileAnalyses: result.summary.file_analyses ?? []
      }
    });

    if (result.summary.authenticity.decision === "fail") {
      await db.update(bettingExtractionJobs).set({
        status: "failed",
        parserCode: result.parser_code,
        ocrProvider: result.ocr_provider ?? null,
        sourceSummary: {
          uploadCount: result.summary.upload_count,
          providerCode: result.provider_code,
          uploadKind: result.upload_kind,
          sourceBreakdown: result.summary.source_breakdown ?? {},
          fileAnalyses: result.summary.file_analyses ?? [],
          authenticity: result.summary.authenticity
        },
        averageConfidence: result.summary.average_confidence.toFixed(4),
        extractedRecordCount: result.summary.extracted_record_count,
        acceptedRecordCount: 0,
        rejectedRecordCount: result.summary.rejected_record_count,
        reviewRequiredCount: result.summary.review_required_count,
        errorMessage: "High-confidence fake or tampered betting upload detected.",
        processingCompletedAt: new Date(result.completed_at)
      }).where(eq(bettingExtractionJobs.id, result.extraction_job_id));

      await db.update(ingestionSessions).set({
        status: "failed",
        completedAt: new Date(result.completed_at),
        errorMessage: "High-confidence fake or tampered betting upload detected.",
        validationSummary: {
          ...(session.validationSummary as Record<string, unknown>),
          mlResultReceivedAt: new Date().toISOString(),
          providerCode: result.provider_code,
          uploadKind: result.upload_kind,
          authenticity: result.summary.authenticity,
          sourceBreakdown: result.summary.source_breakdown ?? {},
          fileAnalyses: result.summary.file_analyses ?? [],
          fraudEnforcement: fraudOutcome
        }
      }).where(eq(ingestionSessions.id, session.id));

      await db.update(bettingUploadFiles).set({
        lifecycleStatus: "failed"
      }).where(eq(bettingUploadFiles.ingestionSessionId, session.id));

      return;
    }

    await clearExistingStagedRecords(result.ingestion_session_id);

    const fingerprints = new Set<string>();
    const stagedRows = result.rows.map((row) => {
      const rowFingerprint = buildFingerprint(row, result.ingestion_session_id);
      const duplicateInBatch = fingerprints.has(rowFingerprint);
      fingerprints.add(rowFingerprint);
      const validationIssues = duplicateInBatch
        ? [...row.validation_issues, "Duplicate record detected in this ingestion batch"]
        : row.validation_issues;

      const status = duplicateInBatch ? "rejected" : "pending_review";

      return {
        userId: result.user_id,
        dataSourceId: result.data_source_id,
        ingestionSessionId: result.ingestion_session_id,
        uploadFileId: row.upload_file_id ?? null,
        extractionJobId: result.extraction_job_id,
        status,
        rowFingerprint,
        externalBetId: row.external_bet_id ?? null,
        providerReference: row.provider_reference ?? null,
        transactionDate: row.transaction_date ? new Date(row.transaction_date) : null,
        settledAt: row.settled_at ? new Date(row.settled_at) : null,
        betAmount: row.bet_amount ?? null,
        odds: row.odds != null ? row.odds.toFixed(2) : null,
        outcome: row.outcome ?? null,
        payoutAmount: row.payout_amount ?? null,
        betType: row.bet_type ?? null,
        league: row.league ?? null,
        eventName: row.event_name ?? null,
        extractionConfidence: row.extraction_confidence.toFixed(4),
        parserCode: row.parser_code,
        validationIssues,
        rawExtractionPayload: row.raw_extraction_payload,
        normalizedPayload: row.normalized_payload,
        reviewerNotes: null,
        importedAt: null
      } satisfies typeof bettingStagedRecords.$inferInsert;
    });

    if (stagedRows.length > 0) {
      await db.insert(bettingStagedRecords).values(stagedRows);
    }

    const pendingReviewCount = stagedRows.filter((row) => row.status === "pending_review").length;
    const rejectedCount = stagedRows.filter((row) => row.status === "rejected").length;
    const validCount = stagedRows.filter((row) => row.validationIssues.length === 0 && row.status === "pending_review").length;

    await db.update(bettingExtractionJobs).set({
      status: stagedRows.length > 0 ? "review_required" : "failed",
      parserCode: result.parser_code,
      ocrProvider: result.ocr_provider ?? null,
      sourceSummary: {
        uploadCount: result.summary.upload_count,
        providerCode: result.provider_code,
        uploadKind: result.upload_kind,
        sourceBreakdown: result.summary.source_breakdown ?? {},
        fileAnalyses: result.summary.file_analyses ?? [],
        authenticity: result.summary.authenticity
      },
      averageConfidence: result.summary.average_confidence.toFixed(4),
      extractedRecordCount: stagedRows.length,
      acceptedRecordCount: validCount,
      rejectedRecordCount: rejectedCount,
      reviewRequiredCount: pendingReviewCount,
      errorMessage: stagedRows.length > 0 ? null : (result.error ?? "No betting rows could be extracted"),
      processingCompletedAt: new Date(result.completed_at)
    }).where(eq(bettingExtractionJobs.id, result.extraction_job_id));

    await db.update(ingestionSessions).set({
      status: stagedRows.length > 0 ? "parsed" : "failed",
      recordCount: stagedRows.length,
      acceptedCount: validCount,
      rejectedCount,
      completedAt: stagedRows.length > 0 ? null : new Date(result.completed_at),
      errorMessage: stagedRows.length > 0 ? null : (result.error ?? "No betting rows could be extracted"),
      validationSummary: {
        ...(session.validationSummary as Record<string, unknown>),
        mlResultReceivedAt: new Date().toISOString(),
        providerCode: result.provider_code,
        uploadKind: result.upload_kind,
        averageConfidence: result.summary.average_confidence,
        reviewRequiredCount: pendingReviewCount,
        extractedRecordCount: stagedRows.length,
        sourceBreakdown: result.summary.source_breakdown ?? {},
        fileAnalyses: result.summary.file_analyses ?? [],
        authenticity: result.summary.authenticity,
        fraudEnforcement: fraudOutcome
      }
    }).where(eq(ingestionSessions.id, session.id));

    await db.update(bettingUploadFiles).set({
      lifecycleStatus: "processed"
    }).where(eq(bettingUploadFiles.ingestionSessionId, session.id));
  }
};
