import { pgTable, index, decimal } from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  extractionJobStatusEnum,
  idColumn,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar
} from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";
import { ingestionSessions } from "./ingestion-sessions.js";

export const bettingExtractionJobs = pgTable(
  "betting_extraction_jobs",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    ingestionSessionId: uuid("ingestion_session_id").notNull().references(() => ingestionSessions.id, { onDelete: "cascade" }),
    status: extractionJobStatusEnum("status").notNull().default("queued"),
    parserCode: varchar("parser_code", { length: 100 }).notNull(),
    ocrProvider: varchar("ocr_provider", { length: 100 }),
    sourceSummary: jsonb("source_summary").notNull().default({}),
    averageConfidence: decimal("average_confidence", { precision: 5, scale: 4 }),
    extractedRecordCount: integer("extracted_record_count").notNull().default(0),
    acceptedRecordCount: integer("accepted_record_count").notNull().default(0),
    rejectedRecordCount: integer("rejected_record_count").notNull().default(0),
    reviewRequiredCount: integer("review_required_count").notNull().default(0),
    errorMessage: text("error_message"),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    processingCompletedAt: timestamp("processing_completed_at", { withTimezone: true }),
    createdAt: createdAtColumn
  },
  (table) => ({
    sessionStatusIdx: index("betting_extraction_jobs_session_status_idx").on(table.ingestionSessionId, table.status),
    userCreatedIdx: index("betting_extraction_jobs_user_created_idx").on(table.userId, table.createdAt)
  })
);
