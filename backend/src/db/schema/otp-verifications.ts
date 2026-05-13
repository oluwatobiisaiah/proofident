import { pgTable, index } from "drizzle-orm/pg-core";
import { boolean, createdAtColumn, idColumn, integer, timestamp, varchar } from "./shared.js";

export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: idColumn,
    phone: varchar("phone", { length: 20 }).notNull(),
    otpCode: varchar("otp_code", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verified: boolean("verified").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    createdAt: createdAtColumn
  },
  (table) => ({
    phoneCreatedAtIdx: index("otp_verifications_phone_created_at_idx").on(table.phone, table.createdAt),
    expiresAtIdx: index("otp_verifications_expires_at_idx").on(table.expiresAt)
  })
);
