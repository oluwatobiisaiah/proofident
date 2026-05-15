import { pgTable, index } from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  idColumn,
  jsonb,
  reviewActionEnum,
  uuid,
  varchar
} from "./shared.js";
import { users } from "./users.js";
import { bettingStagedRecords } from "./betting-staged-records.js";

export const bettingRecordReviews = pgTable(
  "betting_record_reviews",
  {
    id: idColumn,
    stagedRecordId: uuid("staged_record_id").notNull().references(() => bettingStagedRecords.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: reviewActionEnum("action").notNull(),
    previousStatus: varchar("previous_status", { length: 30 }),
    nextStatus: varchar("next_status", { length: 30 }).notNull(),
    patch: jsonb("patch").notNull().default({}),
    notes: varchar("notes", { length: 500 }),
    createdAt: createdAtColumn
  },
  (table) => ({
    stagedRecordCreatedIdx: index("betting_record_reviews_staged_record_created_idx").on(table.stagedRecordId, table.createdAt)
  })
);
