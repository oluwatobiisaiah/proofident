import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, varchar } from "./shared.js";
import { users } from "./users.js";
import { creditScores } from "./credit-scores.js";
import { loans } from "./loans.js";
import { jobApplications } from "./job-applications.js";

export const modelFeedbackEvents = pgTable(
  "model_feedback_events",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    scoreId: varchar("score_id", { length: 36 }).references(() => creditScores.id, { onDelete: "set null" }),
    loanId: varchar("loan_id", { length: 36 }).references(() => loans.id, { onDelete: "set null" }),
    jobApplicationId: varchar("job_application_id", { length: 36 }).references(() => jobApplications.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    featureSnapshot: jsonb("feature_snapshot").notNull().default({}),
    observedOutcome: jsonb("observed_outcome").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    userEventTypeIdx: index("model_feedback_events_user_event_type_idx").on(table.userId, table.eventType)
  })
);
