import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, jsonb, timestamp, varchar } from "./shared.js";
import { users } from "./users.js";

export const incomeRecords = pgTable(
  "income_records",
  {
    id: idColumn,
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    employerName: varchar("employer_name", { length: 255 }),
    amount: integer("amount").notNull(),
    sourceReference: varchar("source_reference", { length: 100 }),
    sourceMetadata: jsonb("source_metadata").notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    createdAt: createdAtColumn
  },
  (table) => ({
    userReceivedAtIdx: index("income_records_user_received_at_idx").on(table.userId, table.receivedAt)
  })
);
