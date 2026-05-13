import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { jobApplications, jobMatches, jobs } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";

export const jobService = {
  async getMatches(userId: string) {
    const matches = await db.query.jobMatches.findMany({
      where: eq(jobMatches.userId, userId),
      orderBy: [desc(jobMatches.matchScore)],
      limit: 10
    });

    const jobIds = matches.map((match) => match.jobId);
    const allJobs = jobIds.length
      ? await db.query.jobs.findMany()
      : [];

    return matches.map((match) => ({
      ...match,
      job: allJobs.find((job) => job.id === match.jobId) ?? null
    }));
  },

  async getJob(jobId: string) {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });

    if (!job) {
      throw new AppError(404, "Job not found", "JOB_NOT_FOUND");
    }

    return job;
  },

  async applyToJob(userId: string, jobId: string, needsLoan: boolean) {
    const existingMatch = await db.query.jobMatches.findFirst({
      where: and(eq(jobMatches.userId, userId), eq(jobMatches.jobId, jobId))
    });

    if (!existingMatch) {
      throw new AppError(400, "Job is not available for this user", "JOB_NOT_MATCHED");
    }

    const [application] = await db.insert(jobApplications).values({
      userId,
      jobId,
      needsLoan,
      status: Number(existingMatch.matchScore) >= 0.7 ? "accepted" : "pending",
      metadata: {
        matchScore: existingMatch.matchScore,
        explanation: existingMatch.explanation
      }
    }).returning();

    return application;
  },

  async getApplications(userId: string) {
    return db.query.jobApplications.findMany({
      where: eq(jobApplications.userId, userId),
      orderBy: [desc(jobApplications.createdAt)]
    });
  }
};
