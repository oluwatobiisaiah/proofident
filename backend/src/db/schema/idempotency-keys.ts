import { pgTable, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, timestamp, updatedAtColumn, varchar } from "./shared.js";

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: idColumn,
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    scope: varchar("scope", { length: 255 }).notNull(),
    requestMethod: varchar("request_method", { length: 10 }).notNull(),
    requestPath: varchar("request_path", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: varchar("response_status", { length: 10 }),
    responseBody: jsonb("response_body"),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    keyScopeUnique: uniqueIndex("idempotency_keys_key_scope_unique").on(table.idempotencyKey, table.scope),
    pendingIdx: index("idempotency_keys_pending_idx").on(table.scope, table.completedAt)
  })
);
