import { pgTable, index } from "drizzle-orm/pg-core";
import { boolean, createdAtColumn, idColumn, jsonb, updatedAtColumn, uuid, varchar } from "./shared.js";
import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const jobApplications = pgTable(
  "job_applications",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    needsLoan: boolean("needs_loan").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    userStatusIdx: index("job_applications_user_status_idx").on(table.userId, table.status)
  })
);
