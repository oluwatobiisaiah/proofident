import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { creditScores } from "./credit-scores.js";
import { loans } from "./loans.js";
import { jobApplications } from "./job-applications.js";

export const modelFeedbackEvents = pgTable(
  "model_feedback_events",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scoreId: uuid("score_id").references(() => creditScores.id, { onDelete: "set null" }),
    loanId: uuid("loan_id").references(() => loans.id, { onDelete: "set null" }),
    jobApplicationId: uuid("job_application_id").references(() => jobApplications.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    featureSnapshot: jsonb("feature_snapshot").notNull().default({}),
    observedOutcome: jsonb("observed_outcome").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    userEventTypeIdx: index("model_feedback_events_user_event_type_idx").on(table.userId, table.eventType)
  })
);
