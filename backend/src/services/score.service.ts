import { desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { creditScores, jobMatches } from "../db/schema/index.js";
import { logger } from "../utils/logger.js";
import { aiClientService } from "./ai-client.service.js";
import { decisionEngineService } from "./decision-engine.service.js";

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
      const scorePayload = await aiClientService.calculateScore(userId);

      const [created] = await db.insert(creditScores).values({
        userId,
        score: scorePayload.credit_score,
        scoreRange: scorePayload.score_range,
        confidence: Number(scorePayload.confidence).toFixed(2),
        confidenceLevel: scorePayload.confidence_level,
        completenessTier: scorePayload.completeness_tier,
        inferredOccupation: scorePayload.inferred_occupation,
        occupationConfidence: Number(scorePayload.occupation_confidence).toFixed(2),
        transferableTraits: scorePayload.transferable_traits,
        supportingSignals: scorePayload.supporting_signals,
        dataSourcesUsed: scorePayload.data_sources_used,
        positiveFactors: scorePayload.positive_factors,
        negativeFactors: scorePayload.negative_factors,
        improvementSuggestions: scorePayload.improvement_suggestions.map((text: string) => ({ text })),
        recommendedLoanLimit: scorePayload.recommended_loan_limit,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }).returning();

      if (!created) {
        throw new Error("Failed to persist AI score");
      }

      const jobPayload = await aiClientService.matchJobs(userId, scorePayload);
      await db.delete(jobMatches).where(eq(jobMatches.userId, userId));
      if (Array.isArray(jobPayload.matches) && jobPayload.matches.length > 0) {
        await db.insert(jobMatches).values(
          jobPayload.matches.map((match: {
            job_id: string;
            match_score: number;
            match_reasons: string[];
            skill_breakdown: Record<string, unknown>;
          }) => ({
            userId,
            jobId: match.job_id,
            matchScore: match.match_score.toFixed(2),
            explanation: match.match_reasons,
            skillBreakdown: match.skill_breakdown
          }))
        );
      }

      return created;
    } catch (err) {
      logger.error({ err, userId }, "ai_score_failed_falling_back_to_rules");
      return decisionEngineService.recalculateScore(userId);
    }
  }
};
