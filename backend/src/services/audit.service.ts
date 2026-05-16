import { db } from "../config/database.js";
import { auditLogs } from "../db/schema/index.js";

type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: "success" | "failure" | "pending";
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export const auditService = {
  async record(entry: AuditEntry) {
    await db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      status: entry.status,
      ipAddress: entry.ipAddress ?? null,
      metadata: entry.metadata ?? {}
    });
  }
};
