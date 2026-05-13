import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  bettingData,
  creditScores,
  dataSources,
  incomeRecords,
  jobs,
  jobMatches,
  loanRepayments,
  loans,
  mobileMoneyTransactions,
  users
} from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";

type Trait = {
  key: string;
  label: string;
  score: number;
  reason: string;
};

type Inference = {
  inferredOccupation: string;
  occupationConfidence: number;
  transferableTraits: Trait[];
  supportingSignals: string[];
};

function scoreBand(score: number) {
  if (score >= 750) return "prime" as const;
  if (score >= 650) return "near_prime" as const;
  if (score >= 550) return "subprime" as const;
  return "deep_subprime" as const;
}

function confidenceBand(confidence: number) {
  if (confidence >= 0.8) return "high" as const;
  if (confidence >= 0.6) return "medium" as const;
  return "low" as const;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dateSpanDays(dates: Date[]) {
  if (dates.length < 2) return 0;
  const min = Math.min(...dates.map((date) => date.getTime()));
  const max = Math.max(...dates.map((date) => date.getTime()));
  return Math.floor((max - min) / (24 * 60 * 60 * 1000));
}

function inferCompletenessTier(args: {
  bettingCount: number;
  bettingSpanDays: number;
  momoCount: number;
  momoSpanDays: number;
}) {
  const hasBetting = args.bettingCount >= 20 && args.bettingSpanDays >= 90;
  const hasMomo = args.momoCount >= 20 && args.momoSpanDays >= 90;

  if (hasBetting && hasMomo) return "tier_1";
  if ((hasBetting || hasMomo) && (args.bettingCount >= 10 || args.momoCount >= 10)) return "tier_2";
  return "tier_3";
}

function inferOccupationAndTraits(args: {
  userState: string | null;
  declaredOccupation: string | null;
  bettingRecords: Array<{ odds: string; outcome: string; betAmount: number }>;
  momoRecords: Array<{ transactionType: string; amount: number; merchantCategory: string | null; recipient: string | null }>;
}) : Inference {
  const creditCount = args.momoRecords.filter((row) => row.transactionType === "credit").length;
  const debitCount = args.momoRecords.filter((row) => row.transactionType === "debit").length;
  const retailCount = args.momoRecords.filter((row) => row.merchantCategory?.includes("retail") || row.merchantCategory?.includes("inventory")).length;
  const supplierCount = new Set(args.momoRecords.filter((row) => row.recipient?.startsWith("supplier_")).map((row) => row.recipient)).size;
  const avgOdds = average(args.bettingRecords.map((row) => Number(row.odds)));
  const winRate = args.bettingRecords.length
    ? args.bettingRecords.filter((row) => row.outcome === "win").length / args.bettingRecords.length
    : 0;

  if (retailCount >= 15 || supplierCount >= 5) {
    return {
      inferredOccupation: "market_trader",
      occupationConfidence: 0.86,
      transferableTraits: [
        { key: "commercial", label: "Commercial ability", score: 82, reason: "Frequent retail inflows and supplier-linked spend." },
        { key: "customer_service", label: "Customer handling", score: 74, reason: "Repeated customer-side payment patterns suggest selling behavior." }
      ],
      supportingSignals: [
        "Recurring customer-like credits across many counterparties.",
        "Inventory and transport spend consistent with active trading.",
        `State alignment supports local field work in ${args.userState ?? "the recorded market region"}.`
      ]
    };
  }

  if (args.bettingRecords.length >= 20 || creditCount >= 6) {
    return {
      inferredOccupation: "gig_worker",
      occupationConfidence: 0.78,
      transferableTraits: [
        { key: "discipline", label: "Discipline", score: avgOdds <= 2.5 ? 78 : 65, reason: "Calculated betting behavior suggests controlled decision making." },
        { key: "reliability", label: "Reliability", score: Math.round(60 + winRate * 20 + Math.min(creditCount, 10)), reason: "Steady wallet activity and repeat income-like credits suggest consistency." }
      ],
      supportingSignals: [
        "Wallet credits show repeat earning activity rather than one-off inflows.",
        "Betting pattern skews toward moderate odds instead of lottery behavior.",
        "Behavior aligns with structured gig work more than casual usage."
      ]
    };
  }

  return {
    inferredOccupation: args.declaredOccupation === "student" ? "early_jobseeker" : "jobseeker",
    occupationConfidence: 0.41,
    transferableTraits: [
      { key: "adaptability", label: "Adaptability", score: 54, reason: "Some activity exists, but not enough to strongly infer stable work patterns." }
    ],
    supportingSignals: [
      "Sparse transaction history.",
      "Not enough corroborating behavioral data to infer a strong occupation path."
    ]
  };
}

function computeBaseScore(args: {
  declaredIncome: number;
  completenessTier: string;
  bettingRecords: Array<{ odds: string; outcome: string; betAmount: number }>;
  momoRecords: Array<{ transactionType: string; amount: number; balanceAfter: number | null; merchantCategory: string | null; recipient: string | null }>;
  onTimeRepayments: number;
  failedRepayments: number;
}) {
  let score = 600;
  const positives: string[] = [];
  const negatives: string[] = [];

  const avgOdds = average(args.bettingRecords.map((row) => Number(row.odds)));
  const winRate = args.bettingRecords.length
    ? args.bettingRecords.filter((row) => row.outcome === "win").length / args.bettingRecords.length
    : 0;
  const avgBalance = average(args.momoRecords.map((row) => row.balanceAfter ?? 0));
  const uniqueRecipients = new Set(args.momoRecords.map((row) => row.recipient).filter(Boolean)).size;
  const billPayments = args.momoRecords.filter((row) => row.merchantCategory === "utilities").length;
  const totalCredits = args.momoRecords.filter((row) => row.transactionType === "credit").reduce((sum, row) => sum + row.amount, 0);
  const totalDebits = args.momoRecords.filter((row) => row.transactionType === "debit").reduce((sum, row) => sum + row.amount, 0);

  if (args.completenessTier === "tier_1") {
    score += 35;
    positives.push("Connected betting and mobile money data gives the system strong confidence.");
  } else if (args.completenessTier === "tier_2") {
    score += 15;
    positives.push("At least one transactional source supports the declared profile.");
  } else {
    score -= 30;
    negatives.push("Thin-file profile limits confidence and suppresses larger approvals.");
  }

  if (args.bettingRecords.length > 0) {
    if (avgOdds > 0 && avgOdds <= 2.5) {
      score += 24;
      positives.push("Betting behavior favors calculated odds over high-risk swings.");
    } else if (avgOdds > 5) {
      score -= 28;
      negatives.push("Betting profile skews toward high-risk odds.");
    }

    if (winRate >= 0.55) {
      score += 12;
      positives.push("Win/loss pattern suggests a more disciplined approach than average.");
    }
  }

  if (avgBalance >= 25000) {
    score += 18;
    positives.push("Wallet balances show some liquidity cushion.");
  } else if (avgBalance < 8000) {
    score -= 18;
    negatives.push("Wallet balance often runs low, reducing repayment comfort.");
  }

  if (uniqueRecipients >= 8) {
    score += 10;
    positives.push("Transaction network diversity suggests stronger social or business activity.");
  }

  if (billPayments >= 4) {
    score += 12;
    positives.push("Utility-style payments suggest repeat obligation handling.");
  }

  if (totalCredits > totalDebits) {
    score += 8;
  } else {
    score -= 8;
  }

  if (args.onTimeRepayments > 0) {
    score += args.onTimeRepayments * 10;
    positives.push("Verified on-time repayments improved trust.");
  }

  if (args.failedRepayments > 0) {
    score -= args.failedRepayments * 20;
    negatives.push("Missed or failed repayments reduce trust.");
  }

  if (args.declaredIncome <= 50000 && args.completenessTier === "tier_3") {
    score -= 10;
    negatives.push("Low declared income plus sparse evidence keeps the profile conservative.");
  }

  return {
    score: Math.max(300, Math.min(850, Math.round(score))),
    positives,
    negatives
  };
}

function recommendedLoanLimitFor(score: number, confidence: number, tier: string) {
  let limit = 0;
  if (score >= 750) limit = 500000;
  else if (score >= 650) limit = 200000;
  else if (score >= 550) limit = 100000;
  else limit = 50000;

  if (tier === "tier_2") limit = Math.min(limit, 100000);
  if (tier === "tier_3") limit = Math.min(limit, 25000);
  if (confidence < 0.6) limit = Math.min(limit, 25000);
  return limit;
}

export const decisionEngineService = {
  async recalculateScore(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const [bettingRecords, momoRecords, repaymentRows, userSources] = await Promise.all([
      db.query.bettingData.findMany({ where: eq(bettingData.userId, userId) }),
      db.query.mobileMoneyTransactions.findMany({ where: eq(mobileMoneyTransactions.userId, userId) }),
      db.query.loanRepayments.findMany({
        where: inArray(loanRepayments.loanId, (
          await db.query.loans.findMany({ where: eq(loans.userId, userId) })
        ).map((loan) => loan.id))
      }),
      db.query.dataSources.findMany({ where: eq(dataSources.userId, userId) })
    ]);

    const completenessTier = inferCompletenessTier({
      bettingCount: bettingRecords.length,
      bettingSpanDays: dateSpanDays(bettingRecords.map((row) => row.transactionDate)),
      momoCount: momoRecords.length,
      momoSpanDays: dateSpanDays(momoRecords.map((row) => row.transactionDate))
    });

    const confidence =
      completenessTier === "tier_1" ? 0.9 :
      completenessTier === "tier_2" ? 0.72 :
      0.38;

    const inference = inferOccupationAndTraits({
      userState: user.state,
      declaredOccupation: user.occupation,
      bettingRecords,
      momoRecords
    });

    const onTimeRepayments = repaymentRows.filter((row) => row.status === "paid").length;
    const failedRepayments = repaymentRows.filter((row) => row.status === "late" || row.status === "missed").length;
    const { score, positives, negatives } = computeBaseScore({
      declaredIncome: user.monthlyIncome ?? 0,
      completenessTier,
      bettingRecords,
      momoRecords,
      onTimeRepayments,
      failedRepayments
    });

    const recommendationLimit = recommendedLoanLimitFor(score, confidence, completenessTier);
    const scoreRange = scoreBand(score);
    const confidenceLevel = confidenceBand(confidence);

    const [created] = await db.insert(creditScores).values({
      userId,
      score,
      scoreRange,
      confidence: confidence.toFixed(2),
      confidenceLevel,
      completenessTier,
      inferredOccupation: inference.inferredOccupation,
      occupationConfidence: inference.occupationConfidence.toFixed(2),
      transferableTraits: inference.transferableTraits,
      supportingSignals: inference.supportingSignals,
      dataSourcesUsed: userSources.map((source) => source.sourceType),
      positiveFactors: positives.map((text) => ({ text })),
      negativeFactors: negatives.map((text) => ({ text })),
      improvementSuggestions: completenessTier === "tier_3"
        ? [{ text: "Connect more data sources to unlock stronger job and loan decisions." }]
        : [{ text: "Maintain verified income and on-time repayments to keep improving your trust profile." }],
      recommendedLoanLimit: recommendationLimit,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }).returning();

    await this.refreshJobMatches(userId, created);
    return created;
  },

  async refreshJobMatches(userId: string, latestScore?: typeof creditScores.$inferSelect) {
    const score = latestScore ?? await db.query.creditScores.findFirst({
      where: eq(creditScores.userId, userId),
      orderBy: [desc(creditScores.generatedAt)]
    });

    if (!score) {
      throw new AppError(400, "Score required before matching jobs", "SCORE_REQUIRED");
    }

    const [user, activeJobs] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.jobs.findMany({ where: eq(jobs.status, "active") })
    ]);

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const traits = Array.isArray(score.transferableTraits) ? score.transferableTraits as Trait[] : [];
    const discipline = traits.find((trait) => trait.key === "discipline")?.score ?? 45;
    const commercial = traits.find((trait) => trait.key === "commercial")?.score ?? 45;
    const reliability = traits.find((trait) => trait.key === "reliability")?.score ?? 45;

    await db.delete(jobMatches).where(eq(jobMatches.userId, userId));

    const inserts = activeJobs.flatMap((job) => {
      const sameState = user.state?.toLowerCase() === job.locationState.toLowerCase();
      const startupCosts = job.startupCosts as Record<string, number>;
      const startupTotal = Object.values(startupCosts).reduce((sum, value) => sum + Number(value), 0);
      const loanEligible = (score.recommendedLoanLimit ?? 0) >= startupTotal && Number(score.confidence) >= 0.6;

      let weightedScore = 0;
      const reasons: string[] = [];
      const skillBreakdown: Record<string, unknown> = {};

      if (job.category === "logistics") {
        weightedScore += Math.min(100, discipline) * 0.4;
        weightedScore += (sameState ? 100 : 30) * 0.25;
        weightedScore += Math.min(100, reliability) * 0.15;
        weightedScore += ((job.minimumIncome > (user.monthlyIncome ?? 0)) ? 90 : 50) * 0.2;

        reasons.push(`Discipline score of ${discipline}/100 supports structured delivery work.`);
        if (sameState) reasons.push(`User is based in ${user.state}, matching the job state.`);
        if (loanEligible) reasons.push(`Starter costs are within the current recommended loan limit.`);
        skillBreakdown.discipline = { user: discipline, threshold: 70 };
        skillBreakdown.reliability = { user: reliability, threshold: 65 };
      } else if (job.category === "sales") {
        weightedScore += Math.min(100, commercial) * 0.45;
        weightedScore += (sameState ? 100 : 40) * 0.25;
        weightedScore += ((job.minimumIncome > (user.monthlyIncome ?? 0)) ? 85 : 50) * 0.2;
        weightedScore += 70 * 0.1;

        reasons.push(`Commercial activity score of ${commercial}/100 supports customer-facing work.`);
        if (sameState) reasons.push(`Local state alignment improves role readiness.`);
        if (loanEligible) reasons.push(`Starter support is small enough to be safely financeable.`);
        skillBreakdown.commercial = { user: commercial, threshold: 65 };
      }

      if (Number(score.confidence) < 0.6 && job.category === "logistics") {
        return [];
      }

      return [{
        userId,
        jobId: job.id,
        matchScore: (weightedScore / 100).toFixed(2),
        explanation: reasons,
        skillBreakdown
      }];
    });

    if (inserts.length > 0) {
      await db.insert(jobMatches).values(inserts);
    }

    return db.query.jobMatches.findMany({
      where: eq(jobMatches.userId, userId),
      orderBy: [desc(jobMatches.matchScore)]
    });
  },

  async getUserSnapshot(userId: string) {
    const [user, score, matches, income, loanRows] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.creditScores.findFirst({ where: eq(creditScores.userId, userId), orderBy: [desc(creditScores.generatedAt)] }),
      db.query.jobMatches.findMany({ where: eq(jobMatches.userId, userId), orderBy: [desc(jobMatches.matchScore)] }),
      db.query.incomeRecords.findMany({ where: eq(incomeRecords.userId, userId), orderBy: [desc(incomeRecords.receivedAt)] }),
      db.query.loans.findMany({ where: eq(loans.userId, userId), orderBy: [desc(loans.createdAt)] })
    ]);

    return { user, score, matches, income, loans: loanRows };
  }
};
