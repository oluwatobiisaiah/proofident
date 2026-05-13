import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  creditScores,
  jobApplications,
  jobMatches,
  jobs,
  loanRepayments,
  loans,
  users
} from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";

function repaymentFor(amount: number, termMonths: number, interestRateBps: number) {
  const total = amount * (1 + interestRateBps / 10_000 * termMonths);
  return Math.round(total / termMonths);
}

export const loanService = {
  async getLoans(userId: string) {
    return db.query.loans.findMany({
      where: eq(loans.userId, userId),
      orderBy: [desc(loans.createdAt)]
    });
  },

  async getLoan(loanId: string) {
    const loan = await db.query.loans.findFirst({ where: eq(loans.id, loanId) });
    if (!loan) {
      throw new AppError(404, "Loan not found", "LOAN_NOT_FOUND");
    }
    const repayments = await db.query.loanRepayments.findMany({
      where: eq(loanRepayments.loanId, loanId),
      orderBy: [desc(loanRepayments.installmentNumber)]
    });
    return { loan, repayments };
  },

  async getLoanOffers(userId: string) {
    const [score, matches, user] = await Promise.all([
      db.query.creditScores.findFirst({ where: eq(creditScores.userId, userId), orderBy: [desc(creditScores.generatedAt)] }),
      db.query.jobMatches.findMany({ where: eq(jobMatches.userId, userId), orderBy: [desc(jobMatches.matchScore)] }),
      db.query.users.findFirst({ where: eq(users.id, userId) })
    ]);

    if (!score || !user) {
      throw new AppError(400, "Score must exist before loan offers", "LOAN_OFFERS_UNAVAILABLE");
    }

    const allJobs = await db.query.jobs.findMany();
    return matches.map((match) => {
      const job = allJobs.find((row) => row.id === match.jobId);
      if (!job) return null;

      const startupCosts = job.startupCosts as Record<string, number>;
      const startupTotal = Object.values(startupCosts).reduce((sum, value) => sum + Number(value), 0);
      const confidence = Number(score.confidence);
      const confidenceEligible = score.completenessTier !== "tier_3" && confidence >= 0.6;
      const amount = Math.min(startupTotal, score.recommendedLoanLimit ?? 0);
      const termMonths = score.scoreRange === "prime" ? 6 : 3;
      const interestRateBps = score.scoreRange === "prime" ? 250 : score.scoreRange === "near_prime" ? 300 : 350;
      const monthlyRepayment = repaymentFor(amount, termMonths, interestRateBps);
      const affordability = job.minimumIncome > 0 ? monthlyRepayment / job.minimumIncome : 1;
      const eligible = confidenceEligible && amount > 0 && affordability <= 0.4;

      return {
        jobId: job.id,
        jobTitle: job.title,
        amount,
        termMonths,
        interestRateBps,
        monthlyRepayment,
        eligible,
        policyReason: eligible
          ? "Job-linked starter cost is within current confidence and affordability policy."
          : "Current confidence or affordability rules do not support this starter loan yet.",
        disbursementDestination: job.employer,
        startupCosts
      };
    }).filter(Boolean);
  },

  async applyForLoan(userId: string, jobId: string, requestedAmount?: number) {
    const [score, job, application] = await Promise.all([
      db.query.creditScores.findFirst({ where: eq(creditScores.userId, userId), orderBy: [desc(creditScores.generatedAt)] }),
      db.query.jobs.findFirst({ where: eq(jobs.id, jobId) }),
      db.query.jobApplications.findFirst({
        where: and(eq(jobApplications.userId, userId), eq(jobApplications.jobId, jobId)),
        orderBy: [desc(jobApplications.createdAt)]
      })
    ]);

    if (!score || !job) {
      throw new AppError(400, "Missing score or job context", "LOAN_CONTEXT_MISSING");
    }

    if (!application || application.status !== "accepted") {
      throw new AppError(400, "Accepted job path is required before loan approval", "JOB_ACCEPTANCE_REQUIRED");
    }

    const startupCosts = job.startupCosts as Record<string, number>;
    const startupTotal = Object.values(startupCosts).reduce((sum, value) => sum + Number(value), 0);
    const approvedAmount = Math.min(requestedAmount ?? startupTotal, score.recommendedLoanLimit ?? 0, startupTotal);

    if (score.completenessTier === "tier_3" || Number(score.confidence) < 0.6 || approvedAmount <= 0) {
      throw new AppError(400, "Current policy does not allow this loan yet", "LOAN_POLICY_REJECTED");
    }

    const termMonths = score.scoreRange === "prime" ? 6 : 3;
    const interestRateBps = score.scoreRange === "prime" ? 250 : score.scoreRange === "near_prime" ? 300 : 350;
    const monthlyRepayment = repaymentFor(approvedAmount, termMonths, interestRateBps);

    if (job.minimumIncome > 0 && monthlyRepayment / job.minimumIncome > 0.4) {
      throw new AppError(400, "Loan fails affordability policy", "LOAN_AFFORDABILITY_REJECTED");
    }

    const [loan] = await db.insert(loans).values({
      userId,
      jobId,
      jobApplicationId: application.id,
      amount: approvedAmount,
      interestRateBps,
      termMonths,
      monthlyRepayment,
      purpose: `${job.title} starter cost`,
      disbursementDestination: job.employer,
      decisionMetadata: {
        score: score.score,
        confidence: score.confidence,
        completenessTier: score.completenessTier,
        startupCosts
      },
      status: "approved",
      approvedAt: new Date()
    }).returning();

    if (!loan) {
      throw new AppError(500, "Failed to create loan", "LOAN_CREATE_FAILED");
    }

    await db.insert(loanRepayments).values(
      Array.from({ length: termMonths }, (_, index): typeof loanRepayments.$inferInsert => ({
        loanId: loan.id,
        installmentNumber: index + 1,
        amount: monthlyRepayment,
        dueDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000),
        status: "pending"
      }))
    );

    return this.getLoan(loan.id);
  }
};
