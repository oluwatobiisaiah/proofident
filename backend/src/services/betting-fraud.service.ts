import { db } from "../config/database.js";
import { redis } from "../config/redis.js";
import { riskFlags } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { auditService } from "./audit.service.js";

const BLOCK_KEY_PREFIX = "betting-fraud-block";
const STRIKE_KEY_PREFIX = "betting-fraud-strikes";

type FraudDecision = "pass" | "review" | "fail";

type FraudSignal = {
  decision: FraudDecision;
  score: number;
  reasons: string[];
  suspected_ai_generated: boolean;
  suspected_tampering: boolean;
  suspected_non_screenshot: boolean;
};

function blockDurationForStrike(strikeCount: number) {
  if (strikeCount <= 1) return 24 * 60 * 60;
  if (strikeCount === 2) return 7 * 24 * 60 * 60;
  return 30 * 24 * 60 * 60;
}

function severityForDecision(decision: FraudDecision) {
  if (decision === "fail") return "high" as const;
  if (decision === "review") return "medium" as const;
  return "low" as const;
}

export const bettingFraudService = {
  async assertUploadAllowed(userId: string) {
    try {
      const key = `${BLOCK_KEY_PREFIX}:${userId}`;
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        throw new AppError(
          429,
          "Betting uploads are temporarily restricted due to a previous fake or tampered screenshot submission.",
          "BETTING_UPLOAD_RESTRICTED",
          {
            retryAfterSeconds: ttl
          }
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
    }
  },

  async handleExtractionFraudResult(params: {
    userId: string;
    ingestionSessionId: string;
    extractionJobId: string;
    fraudSignal: FraudSignal;
    sourceSummary: Record<string, unknown>;
  }) {
    if (params.fraudSignal.decision === "pass") {
      return { blocked: false as const };
    }

    await db.insert(riskFlags).values({
      userId: params.userId,
      source: "betting_extraction",
      flagType: params.fraudSignal.decision === "fail" ? "fake_betting_screenshot_detected" : "suspicious_betting_screenshot_detected",
      severity: severityForDecision(params.fraudSignal.decision),
      status: "open",
      summary: params.fraudSignal.decision === "fail"
        ? "High-confidence fake or tampered betting upload detected."
        : "Suspicious betting upload detected and routed for review.",
      metadata: {
        ingestionSessionId: params.ingestionSessionId,
        extractionJobId: params.extractionJobId,
        fraudSignal: params.fraudSignal,
        sourceSummary: params.sourceSummary
      }
    });

    await auditService.record({
      actorUserId: params.userId,
      action: `betting.upload.${params.fraudSignal.decision}`,
      resourceType: "ingestion_session",
      resourceId: params.ingestionSessionId,
      status: params.fraudSignal.decision === "fail" ? "failure" : "pending",
      metadata: {
        extractionJobId: params.extractionJobId,
        fraudSignal: params.fraudSignal
      }
    });

    if (params.fraudSignal.decision !== "fail") {
      return { blocked: false as const };
    }

    try {
      const strikesKey = `${STRIKE_KEY_PREFIX}:${params.userId}`;
      const strikes = await redis.incr(strikesKey);
      if (strikes === 1) {
        await redis.expire(strikesKey, 365 * 24 * 60 * 60);
      }

      const blockSeconds = blockDurationForStrike(strikes);
      const blockKey = `${BLOCK_KEY_PREFIX}:${params.userId}`;
      await redis.set(blockKey, String(strikes), "EX", blockSeconds);
      return {
        blocked: true as const,
        strikeCount: strikes,
        blockSeconds
      };
    } catch {
      return {
        blocked: false as const
      };
    }
  }
};
