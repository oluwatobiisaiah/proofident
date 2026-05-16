import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, timestamp, updatedAtColumn, uuid, varchar } from "./shared.js";
import { users } from "./users.js";

export const refreshSessions = pgTable(
  "refresh_sessions",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userAgent: varchar("user_agent", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 100 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    userExpiresIdx: index("refresh_sessions_user_expires_idx").on(table.userId, table.expiresAt)
  })
);
