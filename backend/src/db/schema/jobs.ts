import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, integer, jsonb, updatedAtColumn, varchar } from "./shared.js";

export const jobs = pgTable(
  "jobs",
  {
    id: idColumn,
    employerId: varchar("employer_id", { length: 36 }),
    title: varchar("title", { length: 255 }).notNull(),
    employer: varchar("employer", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    locationState: varchar("location_state", { length: 100 }).notNull(),
    locationAreas: jsonb("location_areas").notNull().default([]),
    requirements: jsonb("requirements").notNull().default({}),
    startupCosts: jsonb("startup_costs").notNull().default({}),
    minimumIncome: integer("minimum_income").notNull(),
    maximumIncome: integer("maximum_income"),
    matchCriteriaWeights: jsonb("match_criteria_weights").notNull().default({}),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    categoryIdx: index("jobs_category_idx").on(table.category),
    statusIdx: index("jobs_status_idx").on(table.status)
  })
);
