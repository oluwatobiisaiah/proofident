import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, riskSeverityEnum, riskStatusEnum, text, timestamp, uuid, varchar } from "./shared.js";
import { users } from "./users.js";

export const riskFlags = pgTable(
  "risk_flags",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 50 }).notNull(),
    flagType: varchar("flag_type", { length: 100 }).notNull(),
    severity: riskSeverityEnum("severity").notNull(),
    status: riskStatusEnum("status").notNull().default("open"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAtColumn,
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (table) => ({
    userStatusIdx: index("risk_flags_user_status_idx").on(table.userId, table.status)
  })
);
