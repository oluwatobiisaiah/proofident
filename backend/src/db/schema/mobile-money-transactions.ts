import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, timestamp, varchar } from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";

export const mobileMoneyTransactions = pgTable(
  "mobile_money_transactions",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: varchar("data_source_id", { length: 36 }).notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    transactionType: varchar("transaction_type", { length: 50 }).notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after"),
    recipient: varchar("recipient", { length: 255 }),
    merchantCategory: varchar("merchant_category", { length: 100 }),
    description: varchar("description", { length: 500 }),
    createdAt: createdAtColumn
  },
  (table) => ({
    userTransactionDateIdx: index("mobile_money_transactions_user_transaction_date_idx").on(table.userId, table.transactionDate),
    transactionDateIdx: index("mobile_money_transactions_transaction_date_idx").on(table.transactionDate)
  })
);
