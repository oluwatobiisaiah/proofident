import { pgTable, index, uniqueIndex, decimal } from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  idColumn,
  integer,
  jsonb,
  stagedRecordStatusEnum,
  timestamp,
  uuid,
  varchar
} from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";
import { ingestionSessions } from "./ingestion-sessions.js";
import { bettingUploadFiles } from "./betting-upload-files.js";
import { bettingExtractionJobs } from "./betting-extraction-jobs.js";

export const bettingStagedRecords = pgTable(
  "betting_staged_records",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    ingestionSessionId: uuid("ingestion_session_id").notNull().references(() => ingestionSessions.id, { onDelete: "cascade" }),
    uploadFileId: uuid("upload_file_id").references(() => bettingUploadFiles.id, { onDelete: "set null" }),
    extractionJobId: uuid("extraction_job_id").references(() => bettingExtractionJobs.id, { onDelete: "set null" }),
    status: stagedRecordStatusEnum("status").notNull().default("pending_review"),
    rowFingerprint: varchar("row_fingerprint", { length: 128 }).notNull(),
    externalBetId: varchar("external_bet_id", { length: 120 }),
    providerReference: varchar("provider_reference", { length: 120 }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    betAmount: integer("bet_amount"),
    odds: decimal("odds", { precision: 10, scale: 2 }),
    outcome: varchar("outcome", { length: 20 }),
    payoutAmount: integer("payout_amount"),
    betType: varchar("bet_type", { length: 50 }),
    league: varchar("league", { length: 100 }),
    eventName: varchar("event_name", { length: 255 }),
    extractionConfidence: decimal("extraction_confidence", { precision: 5, scale: 4 }),
    parserCode: varchar("parser_code", { length: 100 }).notNull(),
    validationIssues: jsonb("validation_issues").notNull().default([]),
    rawExtractionPayload: jsonb("raw_extraction_payload").notNull().default({}),
    normalizedPayload: jsonb("normalized_payload").notNull().default({}),
    reviewerNotes: varchar("reviewer_notes", { length: 500 }),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    createdAt: createdAtColumn
  },
  (table) => ({
    sessionStatusIdx: index("betting_staged_records_session_status_idx").on(table.ingestionSessionId, table.status),
    jobIdx: index("betting_staged_records_job_idx").on(table.extractionJobId),
    userDateIdx: index("betting_staged_records_user_date_idx").on(table.userId, table.transactionDate),
    sessionFingerprintIdx: uniqueIndex("betting_staged_records_session_fingerprint_idx").on(table.ingestionSessionId, table.rowFingerprint)
  })
);
