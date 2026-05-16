import { pgTable, index } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, jsonb, uuid, varchar } from "./shared.js";
import { users } from "./users.js";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: idColumn,
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: varchar("resource_id", { length: 120 }),
    status: varchar("status", { length: 30 }).notNull(),
    ipAddress: varchar("ip_address", { length: 100 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    actorCreatedIdx: index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
    actionCreatedIdx: index("audit_logs_action_created_idx").on(table.action, table.createdAt)
  })
);
