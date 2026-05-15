import { desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { scoreCalculationQueue } from "../config/queue.js";
import { creditScores, jobMatches } from "../db/schema/index.js";
import { logger } from "../utils/logger.js";
import { aiClientService, type AiScorePayload } from "./ai-client.service.js";
import { decisionEngineService } from "./decision-engine.service.js";

type RecalculationTrigger = {
  trigger: string;
  ingestionSessionId?: string | undefined;
  sourceType?: string | undefined;
};

export type ScoreCalculationJobPayload = {
  job_id: string;
  user_id: string;
  trigger: string;
  ingestion_session_id?: string | undefined;
  source_type?: string | undefined;
  created_at: string;
  score_request: Awaited<ReturnType<typeof aiClientService.buildScoreRequestPayload>>;
};

export type ScoreResultJobPayload = {
  job_id: string;
  user_id: string;
  status: "success" | "failed";
  score_data?: AiScorePayload | undefined;
  error?: string | null | undefined;
  completed_at: string;
};

async function persistGeneratedScore(userId: string) {
  const scorePayload = await aiClientService.calculateScore(userId);
  return scoreService.applyScoreResult({
    job_id: `sync:${userId}:${Date.now()}`,
    user_id: userId,
    status: "success",
    score_data: scorePayload,
    completed_at: new Date().toISOString()
  });
}

export const scoreService = {
  async getLatestScore(userId: string) {
    return db.query.creditScores.findFirst({
      where: eq(creditScores.userId, userId),
      orderBy: [desc(creditScores.generatedAt)]
    });
  },

  async getScoreStatus(userId: string) {
    const score = await this.getLatestScore(userId);
    if (!score) {
      return {
        status: "not_started",
        reason: "No score generated yet."
      };
    }

    return {
      status: "ready",
      generatedAt: score.generatedAt,
      expiresAt: score.expiresAt,
      confidenceLevel: score.confidenceLevel,
      completenessTier: score.completenessTier
    };
  },

  async recalculate(userId: string) {
    try {
      return await persistGeneratedScore(userId);
    } catch (err) {
      logger.error({ err, userId }, "ai_score_failed_falling_back_to_rules");
      return decisionEngineService.recalculateScore(userId);
    }
  },

  async recalculateAsync(userId: string, trigger: RecalculationTrigger) {
    try {
      const scoreRequest = await aiClientService.buildScoreRequestPayload(userId);
      const jobId = `${userId}:${trigger.trigger}:${trigger.ingestionSessionId ?? "manual"}`;

      const payload: ScoreCalculationJobPayload = {
        job_id: jobId,
        user_id: userId,
        trigger: trigger.trigger,
        created_at: new Date().toISOString(),
        score_request: scoreRequest,
        ...(trigger.ingestionSessionId ? { ingestion_session_id: trigger.ingestionSessionId } : {}),
        ...(trigger.sourceType ? { source_type: trigger.sourceType } : {})
      };

      await scoreCalculationQueue.add("score-calculation", payload, {
        jobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000
        },
        removeOnComplete: 100,
        removeOnFail: 100
      });

      return {
        queued: true as const
      };
    } catch (err) {
      logger.warn({ err, userId, trigger }, "score_queue_failed_falling_back_to_sync");
      const score = await this.recalculate(userId);
      return {
        queued: false as const,
        fallbackScoreId: score?.id ?? null
      };
    }
  },

  async applyScoreResult(result: ScoreResultJobPayload) {
    if (result.status === "failed" || !result.score_data) {
      logger.error({ result }, "score_result_failed_falling_back_to_rules");
      return decisionEngineService.recalculateScore(result.user_id);
    }

    const [created] = await db.insert(creditScores).values({
      userId: result.user_id,
      score: result.score_data.credit_score,
      scoreRange: result.score_data.score_range,
      confidence: Number(result.score_data.confidence).toFixed(2),
      confidenceLevel: result.score_data.confidence_level,
      completenessTier: result.score_data.completeness_tier,
      inferredOccupation: result.score_data.inferred_occupation,
      occupationConfidence: Number(result.score_data.occupation_confidence).toFixed(2),
      transferableTraits: result.score_data.transferable_traits,
      supportingSignals: result.score_data.supporting_signals,
      dataSourcesUsed: result.score_data.data_sources_used,
      positiveFactors: result.score_data.positive_factors.map((f) => ({ text: f.description })),
      negativeFactors: result.score_data.negative_factors.map((f) => ({ text: f.description })),
      improvementSuggestions: result.score_data.improvement_suggestions.map((text: string) => ({ text })),
      recommendedLoanLimit: result.score_data.recommended_loan_limit,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }).returning();

    if (!created) {
      throw new Error("Failed to persist queued AI score");
    }

    const jobPayload = await aiClientService.matchJobs(result.user_id, result.score_data);
    await db.delete(jobMatches).where(eq(jobMatches.userId, result.user_id));
    if (Array.isArray(jobPayload.matches) && jobPayload.matches.length > 0) {
      await db.insert(jobMatches).values(
        jobPayload.matches.map((match) => ({
          userId: result.user_id,
          jobId: match.job_id,
          matchScore: match.match_score.toFixed(2),
          explanation: match.match_reasons,
          skillBreakdown: match.skill_breakdown
        }))
      );
    }

    return created;
  }
};
