import { desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { creditScores } from "../db/schema/index.js";
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
    return decisionEngineService.recalculateScore(userId);
  }
};
