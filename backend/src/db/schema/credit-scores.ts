import { pgTable, index } from "drizzle-orm/pg-core";
import { confidenceLevelEnum, createdAtColumn, decimal, idColumn, integer, jsonb, scoreRangeEnum, timestamp, varchar } from "./shared.js";
import { users } from "./users.js";

export const creditScores = pgTable(
  "credit_scores",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    scoreRange: scoreRangeEnum("score_range").notNull(),
    confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
    confidenceLevel: confidenceLevelEnum("confidence_level").notNull(),
    completenessTier: varchar("completeness_tier", { length: 20 }).notNull().default("tier_3"),
    inferredOccupation: varchar("inferred_occupation", { length: 100 }),
    occupationConfidence: decimal("occupation_confidence", { precision: 3, scale: 2 }),
    transferableTraits: jsonb("transferable_traits").notNull().default([]),
    supportingSignals: jsonb("supporting_signals").notNull().default([]),
    dataSourcesUsed: jsonb("data_sources_used").notNull().default([]),
    positiveFactors: jsonb("positive_factors").notNull().default([]),
    negativeFactors: jsonb("negative_factors").notNull().default([]),
    improvementSuggestions: jsonb("improvement_suggestions").notNull().default([]),
    recommendedLoanLimit: integer("recommended_loan_limit"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    userGeneratedAtIdx: index("credit_scores_user_generated_at_idx").on(table.userId, table.generatedAt),
    scoreIdx: index("credit_scores_score_idx").on(table.score),
    expiresAtIdx: index("credit_scores_expires_at_idx").on(table.expiresAt)
  })
);
