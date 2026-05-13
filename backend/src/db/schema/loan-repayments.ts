import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, repaymentStatusEnum, timestamp, varchar } from "./shared.js";
import { loans } from "./loans.js";

export const loanRepayments = pgTable(
  "loan_repayments",
  {
    id: idColumn,
    loanId: varchar("loan_id", { length: 36 }).notNull().references(() => loans.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull(),
    amount: integer("amount").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    squadReference: varchar("squad_reference", { length: 100 }),
    status: repaymentStatusEnum("status").notNull().default("pending"),
    createdAt: createdAtColumn
  },
  (table) => ({
    loanDueDateIdx: index("loan_repayments_loan_due_date_idx").on(table.loanId, table.dueDate)
  })
);
