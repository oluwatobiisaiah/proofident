import { pgTable, index } from "drizzle-orm/pg-core";
import { connectionMethodEnum, createdAtColumn, idColumn, ingestionStatusEnum, integer, jsonb, sourceTypeEnum, text, timestamp, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";

export const ingestionSessions = pgTable(
  "ingestion_sessions",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, { onDelete: "set null" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    ingestionMethod: connectionMethodEnum("ingestion_method").notNull(),
    status: ingestionStatusEnum("status").notNull().default("uploaded"),
    recordCount: integer("record_count"),
    acceptedCount: integer("accepted_count"),
    rejectedCount: integer("rejected_count"),
    validationSummary: jsonb("validation_summary").notNull().default({}),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAtColumn
  },
  (table) => ({
    userStatusIdx: index("ingestion_sessions_user_status_idx").on(table.userId, table.status)
  })
);
