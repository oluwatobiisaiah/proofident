import { pgTable, index } from "drizzle-orm/pg-core";
import { connectionMethodEnum, createdAtColumn, dataSourceStatusEnum, idColumn, sourceTypeEnum, timestamp, varchar } from "./shared.js";
import { users } from "./users.js";

export const dataSources = pgTable(
  "data_sources",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceName: varchar("source_name", { length: 100 }).notNull(),
    connectionMethod: connectionMethodEnum("connection_method").notNull(),
    accessToken: varchar("access_token", { length: 2048 }),
    refreshToken: varchar("refresh_token", { length: 2048 }),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    dataFilePath: varchar("data_file_path", { length: 500 }),
    dataHash: varchar("data_hash", { length: 64 }),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    status: dataSourceStatusEnum("status").notNull().default("active"),
    createdAt: createdAtColumn
  },
  (table) => ({
    userSourceTypeIdx: index("data_sources_user_source_type_idx").on(table.userId, table.sourceType),
    statusIdx: index("data_sources_status_idx").on(table.status)
  })
);
