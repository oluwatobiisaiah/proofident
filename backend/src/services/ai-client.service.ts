import { desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import {
  bettingData,
  jobs,
  mobileMoneyTransactions,
  users
} from "../db/schema/index.js";
import { hashValue } from "../utils/security.js";

type AiScorePayload = {
  user_id: string;
  credit_score: number;
  score_range: "prime" | "near_prime" | "subprime" | "deep_subprime";
  confidence: number;
  confidence_level: "low" | "medium" | "high";
  completeness_tier: string;
  data_sources_used: string[];
  inferred_occupation: string;
  occupation_confidence: number;
  transferable_traits: Array<{ key: string; label: string; score: number; reason: string }>;
  supporting_signals: string[];
  positive_factors: Array<{ factor: string; impact: number; description: string }>;
  negative_factors: Array<{ factor: string; impact: number; description: string }>;
  improvement_suggestions: string[];
  recommended_loan_limit: number;
  processing_time_ms: number;
};

type AiJobPayload = {
  user_id: string;
  total_jobs_evaluated: number;
  jobs_passed_hard_filter: number;
  matches: Array<{
    job_id: string;
    match_score: number;
    match_percentage: number;
    match_reasons: string[];
    skill_breakdown: Record<string, unknown>;
  }>;
  processing_time_ms: number;
};

function authHeaders() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${env.AI_SERVICE_TOKEN}`
  };
}

function ageFromDateOfBirth(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return undefined;
  }

  return Math.max(
    18,
    Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  );
}

export const aiClientService = {
  async health() {
    const response = await fetch(`${env.AI_SERVICE_URL}/health`, {
      headers: authHeaders()
    });

    if (!response.ok) {
      throw new Error(`AI service health failed with ${response.status}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  },

  async calculateScore(userId: string): Promise<AiScorePayload> {
    const [user, bets, momo] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.bettingData.findMany({ where: eq(bettingData.userId, userId), orderBy: [desc(bettingData.transactionDate)] }),
      db.query.mobileMoneyTransactions.findMany({ where: eq(mobileMoneyTransactions.userId, userId), orderBy: [desc(mobileMoneyTransactions.transactionDate)] })
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    const payload = {
      user_id: user.id,
      betting_data: bets.length > 0 ? {
        bets: bets.map((bet) => ({
          date: bet.transactionDate.toISOString(),
          amount: bet.betAmount,
          odds: Number(bet.odds),
          outcome: bet.outcome,
          payout: bet.payoutAmount ?? 0,
          bet_type: bet.betType ?? "single",
          league: bet.league ?? undefined
        })),
        total_deposits: bets.reduce((sum, bet) => sum + bet.betAmount, 0),
        total_withdrawals: bets.reduce((sum, bet) => sum + (bet.payoutAmount ?? 0), 0)
      } : undefined,
      mobile_money_data: momo.length > 0 ? {
        transactions: momo.map((txn) => ({
          date: txn.transactionDate.toISOString(),
          type: txn.transactionType,
          amount: txn.amount,
          balance_after: txn.balanceAfter ?? undefined,
          merchant: txn.counterpartyName ?? txn.recipient ?? undefined,
          merchant_category: txn.merchantCategory ?? undefined,
          recipient_hash: txn.counterpartyAccountRef
            ? hashValue(txn.counterpartyAccountRef, "counterparty")
            : txn.recipient
              ? hashValue(txn.recipient, "counterparty")
              : undefined
        }))
      } : undefined,
      self_declared: {
        occupation: user.occupation ?? "unemployed",
        monthly_income: user.monthlyIncome ?? 0,
        state: user.state ?? "unknown",
        age: ageFromDateOfBirth(user.dateOfBirth),
        employment_tenure_years: undefined,
        has_smartphone: true,
        has_bike: false,
        has_car: false
      }
    };

    const response = await fetch(`${env.AI_SERVICE_URL}/v1/score/credit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI score failed with ${response.status}`);
    }

    return response.json() as Promise<AiScorePayload>;
  },

  async matchJobs(userId: string, scorePayload: {
    credit_score: number;
    confidence: number;
    completeness_tier: string;
    inferred_occupation: string;
    transferable_traits: Array<{ key: string; score: number }>;
  }): Promise<AiJobPayload> {
    const [user, availableJobs] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.jobs.findMany({ where: eq(jobs.status, "active") })
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    const payload = {
      user_profile: {
        user_id: user.id,
        credit_score: scorePayload.credit_score,
        confidence: scorePayload.confidence,
        completeness_tier: scorePayload.completeness_tier,
        location_state: user.state ?? "unknown",
        occupation: scorePayload.inferred_occupation,
        monthly_income: user.monthlyIncome ?? 0,
        age: ageFromDateOfBirth(user.dateOfBirth),
        has_smartphone: true,
        has_bike: false,
        has_car: false,
        skills: Object.fromEntries(
          scorePayload.transferable_traits.map((trait) => [trait.key, trait.score / 100])
        )
      },
      available_jobs: availableJobs.map((job) => {
        const startupCosts = job.startupCosts as Record<string, number>;
        const startupCost = Object.values(startupCosts).reduce((sum, value) => sum + Number(value), 0);
        const requirements = job.requirements as Record<string, unknown>;
        return {
          job_id: job.id,
          title: job.title,
          category: job.category,
          location_state: job.locationState,
          min_income: job.minimumIncome,
          max_income: job.maximumIncome ?? job.minimumIncome,
          startup_cost: startupCost,
          startup_cost_breakdown: startupCosts,
          min_credit_score: job.category === "logistics" ? 650 : 550,
          required_skills: job.category === "logistics"
            ? { discipline: 0.7, reliability: 0.65 }
            : { commercial: 0.65, customer_service: 0.5 },
          required_items: [
            ...(Boolean(requirements.smartphone) ? ["smartphone"] : []),
            ...(job.category === "logistics" ? ["bike"] : [])
          ],
          employment_type: job.category === "logistics" ? "gig" : "field",
          min_age: Array.isArray(requirements.ageRange) ? Number(requirements.ageRange[0]) : undefined,
          max_age: Array.isArray(requirements.ageRange) ? Number(requirements.ageRange[1]) : undefined,
          employer: job.employer
        };
      })
    };

    const response = await fetch(`${env.AI_SERVICE_URL}/v1/match/jobs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI job matching failed with ${response.status}`);
    }

    return response.json() as Promise<AiJobPayload>;
  }
};
