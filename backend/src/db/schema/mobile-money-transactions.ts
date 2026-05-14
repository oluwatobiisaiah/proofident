import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, jsonb, timestamp, transactionStatusEnum, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";

export const mobileMoneyTransactions = pgTable(
  "mobile_money_transactions",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    externalTransactionId: varchar("external_transaction_id", { length: 120 }),
    providerReference: varchar("provider_reference", { length: 120 }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    transactionType: varchar("transaction_type", { length: 50 }).notNull(),
    transactionStatus: transactionStatusEnum("transaction_status").notNull().default("successful"),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after"),
    currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
    channel: varchar("channel", { length: 50 }),
    recipient: varchar("recipient", { length: 255 }),
    counterpartyName: varchar("counterparty_name", { length: 255 }),
    counterpartyAccountRef: varchar("counterparty_account_ref", { length: 255 }),
    merchantCategory: varchar("merchant_category", { length: 100 }),
    description: varchar("description", { length: 500 }),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    userTransactionDateIdx: index("mobile_money_transactions_user_transaction_date_idx").on(table.userId, table.transactionDate),
    transactionDateIdx: index("mobile_money_transactions_transaction_date_idx").on(table.transactionDate)
  })
);
