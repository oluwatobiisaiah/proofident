import { pgTable, uniqueIndex, index } from "drizzle-orm/pg-core";
import { boolean, createdAtColumn, date, idColumn, integer, updatedAtColumn, varchar } from "./shared.js";

export const users = pgTable(
  "users",
  {
    id: idColumn,
    phone: varchar("phone", { length: 20 }).notNull(),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    bvn: varchar("bvn", { length: 255 }),
    bvnVerified: boolean("bvn_verified").notNull().default(false),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    dateOfBirth: date("date_of_birth"),
    state: varchar("state", { length: 50 }),
    occupation: varchar("occupation", { length: 100 }),
    monthlyIncome: integer("monthly_income"),
    squadVirtualAccount: varchar("squad_virtual_account", { length: 20 }),
    squadCustomerId: varchar("squad_customer_id", { length: 100 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    phoneUnique: uniqueIndex("users_phone_unique").on(table.phone),
    bvnUnique: uniqueIndex("users_bvn_unique").on(table.bvn),
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    squadVirtualAccountUnique: uniqueIndex("users_squad_virtual_account_unique").on(
      table.squadVirtualAccount
    ),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt)
  })
);
