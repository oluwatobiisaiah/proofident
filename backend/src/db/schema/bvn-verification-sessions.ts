import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, timestamp, updatedAtColumn, uuid, varchar } from "./shared.js";
import { users } from "./users.js";

export const bvnVerificationSessions = pgTable(
  "bvn_verification_sessions",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bvnHash: varchar("bvn_hash", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull().default("mono"),
    providerSessionId: varchar("provider_session_id", { length: 120 }).notNull(),
    challengePayload: jsonb("challenge_payload").notNull().default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    userCreatedIdx: index("bvn_verification_sessions_user_created_idx").on(table.userId, table.createdAt),
    providerSessionIdx: index("bvn_verification_sessions_provider_session_idx").on(table.providerSessionId)
  })
);
