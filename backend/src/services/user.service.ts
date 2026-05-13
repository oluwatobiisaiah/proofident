import { desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { creditScores, dataSources, ingestionSessions, riskFlags, users } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
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
      method: "local-dev",
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
        note: "Hackathon ingestion path is accepted and ready for scoring."
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
  }
};
