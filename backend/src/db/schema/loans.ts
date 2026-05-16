import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, jsonb, loanStatusEnum, timestamp, updatedAtColumn, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { jobs } from "./jobs.js";
import { jobApplications } from "./job-applications.js";

export const loans = pgTable(
  "loans",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    jobApplicationId: uuid("job_application_id").references(() => jobApplications.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    interestRateBps: integer("interest_rate_bps").notNull(),
    termMonths: integer("term_months").notNull(),
    monthlyRepayment: integer("monthly_repayment").notNull(),
    purpose: varchar("purpose", { length: 255 }).notNull(),
    disbursementDestination: varchar("disbursement_destination", { length: 255 }).notNull(),
    disbursementReference: varchar("disbursement_reference", { length: 100 }),
    decisionMetadata: jsonb("decision_metadata").notNull().default({}),
    status: loanStatusEnum("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    disbursedAt: timestamp("disbursed_at", { withTimezone: true }),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    userStatusIdx: index("loans_user_status_idx").on(table.userId, table.status)
  })
);
