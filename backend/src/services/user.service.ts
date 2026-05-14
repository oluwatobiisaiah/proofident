import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { creditScores, dataSources, ingestionSessions, riskFlags, users } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { auditService } from "./audit.service.js";
import { squadService } from "./squad.service.js";
import { timelineService } from "./timeline.service.js";

export const userService = {
  async getById(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    return user;
  },

  async getSummary(userId: string) {
    const [user, latestScore, flags] = await Promise.all([
      this.getById(userId),
      db.query.creditScores.findFirst({
        where: eq(creditScores.userId, userId),
        orderBy: [desc(creditScores.generatedAt)]
      }),
      db.query.riskFlags.findMany({
        where: eq(riskFlags.userId, userId),
        orderBy: [desc(riskFlags.createdAt)],
        limit: 10
      })
    ]);

    return {
      user,
      latestScore,
      flags
    };
  },

  async getTimeline(userId: string) {
    return timelineService.getUserTimeline(userId);
  },

  async getDataSources(userId: string) {
    return db.query.dataSources.findMany({
      where: eq(dataSources.userId, userId),
      orderBy: [desc(dataSources.connectedAt)]
    });
  },

  async createUploadPresign(userId: string, sourceType: string) {
    await this.getById(userId);
    return {
      uploadId: crypto.randomUUID(),
      sourceType,
      method: "file_ingestion",
      uploadUrl: `/mock-uploads/${userId}/${sourceType}/${Date.now()}.csv`
    };
  },

  async startIngestion(userId: string, sourceType: "betting" | "mobile_money" | "telco" | "self_declared", ingestionMethod: "oauth" | "manual_upload" | "seeded_demo", dataSourceId?: string) {
    const [session] = await db.insert(ingestionSessions).values({
      userId,
      dataSourceId,
      sourceType,
      ingestionMethod,
      status: "ready_for_scoring",
      recordCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      validationSummary: {
        note: "Ingestion session created and awaiting validated file parse or provider sync."
      }
    }).returning();

    return session;
  },

  async getIngestion(ingestionId: string) {
    const session = await db.query.ingestionSessions.findFirst({
      where: eq(ingestionSessions.id, ingestionId)
    });

    if (!session) {
      throw new AppError(404, "Ingestion session not found", "INGESTION_NOT_FOUND");
    }

    return session;
  },

  async getIngestionForUser(userId: string, ingestionId: string) {
    const session = await db.query.ingestionSessions.findFirst({
      where: and(eq(ingestionSessions.id, ingestionId), eq(ingestionSessions.userId, userId))
    });

    if (!session) {
      throw new AppError(404, "Ingestion session not found", "INGESTION_NOT_FOUND");
    }

    return session;
  },

  async provisionVirtualAccount(userId: string) {
    const user = await this.getById(userId);

    if (!user.bvnVerified) {
      throw new AppError(400, "BVN verification is required before creating a settlement account", "VIRTUAL_ACCOUNT_KYC_REQUIRED");
    }

    if (user.squadVirtualAccount) {
      return {
        accountNumber: user.squadVirtualAccount,
        customerIdentifier: user.squadCustomerId
      };
    }

    const nameParts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);

    if (nameParts.length < 2) {
      throw new AppError(400, "User full name is required before creating a virtual account", "VIRTUAL_ACCOUNT_NAME_REQUIRED");
    }

    const virtualAccount = await squadService.createVirtualAccount({
      customerIdentifier: `proofident-${user.id}`,
      firstName: nameParts[0] ?? "Customer",
      lastName: nameParts.slice(1).join(" "),
      phoneNumber: user.phone
    });

    const [updated] = await db.update(users).set({
      squadVirtualAccount: virtualAccount.accountNumber,
      squadCustomerId: virtualAccount.customerIdentifier
    }).where(eq(users.id, userId)).returning();

    if (!updated) {
      throw new AppError(500, "Failed to save virtual account", "VIRTUAL_ACCOUNT_SAVE_FAILED");
    }

    await auditService.record({
      actorUserId: userId,
      action: "wallet.virtual_account.created",
      resourceType: "user",
      resourceId: userId,
      status: "success",
      metadata: {
        accountNumber: virtualAccount.accountNumber
      }
    });

    return virtualAccount;
  }
};
