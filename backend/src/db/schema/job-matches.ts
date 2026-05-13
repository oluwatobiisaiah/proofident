import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, decimal, idColumn, jsonb, varchar } from "./shared.js";
import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const jobMatches = pgTable(
  "job_matches",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: varchar("job_id", { length: 36 }).notNull().references(() => jobs.id, { onDelete: "cascade" }),
    matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
    explanation: jsonb("explanation").notNull().default([]),
    skillBreakdown: jsonb("skill_breakdown").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    userMatchScoreIdx: index("job_matches_user_match_score_idx").on(table.userId, table.matchScore)
  })
);
