import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn, varchar } from "./shared.js";

export const employers = pgTable(
  "employers",
  {
    id: idColumn,
    name: varchar("name", { length: 255 }).notNull(),
    logoUrl: varchar("logo_url", { length: 500 }),
    squadAccountNumber: varchar("squad_account_number", { length: 20 }),
    apiKey: varchar("api_key", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: createdAtColumn,
    updatedAt: updatedAtColumn
  },
  (table) => ({
    nameUnique: uniqueIndex("employers_name_unique").on(table.name)
  })
);
