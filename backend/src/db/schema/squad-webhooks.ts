import { pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { boolean, createdAtColumn, idColumn, jsonb, text, timestamp, varchar } from "./shared.js";

export const squadWebhooks = pgTable(
  "squad_webhooks",
  {
    id: idColumn,
    eventId: varchar("event_id", { length: 100 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: createdAtColumn
  },
  (table) => ({
    eventIdUnique: uniqueIndex("squad_webhooks_event_id_unique").on(table.eventId),
    eventIdIdx: index("squad_webhooks_event_id_idx").on(table.eventId),
    processedIdx: index("squad_webhooks_processed_idx").on(table.processed)
  })
);
