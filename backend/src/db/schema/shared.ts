import { sql } from "drizzle-orm";
import { timestamp, uuid, varchar, integer, boolean, jsonb, decimal, text, date, pgEnum } from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", ["betting", "mobile_money", "telco", "self_declared"]);
export const connectionMethodEnum = pgEnum("connection_method", ["oauth", "manual_upload", "seeded_demo"]);
export const dataSourceStatusEnum = pgEnum("data_source_status", ["active", "expired", "disconnected", "error"]);
export const scoreRangeEnum = pgEnum("score_range", ["prime", "near_prime", "subprime", "deep_subprime"]);
export const confidenceLevelEnum = pgEnum("confidence_level", ["low", "medium", "high"]);
export const loanStatusEnum = pgEnum("loan_status", ["pending", "approved", "disbursed", "active", "overdue", "defaulted", "completed", "rejected"]);
export const repaymentStatusEnum = pgEnum("repayment_status", ["pending", "paid", "late", "missed"]);
export const ingestionStatusEnum = pgEnum("ingestion_status", ["uploaded", "validating", "parsed", "rejected", "ready_for_scoring", "failed"]);
export const riskSeverityEnum = pgEnum("risk_severity", ["low", "medium", "high", "critical"]);
export const riskStatusEnum = pgEnum("risk_status", ["open", "reviewing", "resolved", "dismissed"]);

export const idColumn = uuid("id").defaultRandom().primaryKey();
export const createdAtColumn = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const updatedAtColumn = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date());

export {
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  sql,
  text,
  timestamp,
  varchar
};
