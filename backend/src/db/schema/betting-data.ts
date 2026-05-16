import { pgTable, index, decimal } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, timestamp, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";

export const bettingData = pgTable(
  "betting_data",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    externalBetId: varchar("external_bet_id", { length: 120 }),
    providerReference: varchar("provider_reference", { length: 120 }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    betAmount: integer("bet_amount").notNull(),
    odds: decimal("odds", { precision: 10, scale: 2 }).notNull(),
    outcome: varchar("outcome", { length: 20 }).notNull(),
    payoutAmount: integer("payout_amount"),
    betType: varchar("bet_type", { length: 50 }),
    league: varchar("league", { length: 100 }),
    rawPayload: varchar("raw_payload", { length: 4000 }),
    createdAt: createdAtColumn
  },
  (table) => ({
    userTransactionDateIdx: index("betting_data_user_transaction_date_idx").on(table.userId, table.transactionDate),
    transactionDateIdx: index("betting_data_transaction_date_idx").on(table.transactionDate)
  })
);
