import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  creditScores,
  incomeRecords,
  loanRepayments,
  loans,
  riskFlags
} from "../db/schema/index.js";

export const timelineService = {
  async getUserTimeline(userId: string) {
    const [scores, userLoans, income, flags] = await Promise.all([
      db.query.creditScores.findMany({ where: eq(creditScores.userId, userId), orderBy: [desc(creditScores.generatedAt)], limit: 5 }),
      db.query.loans.findMany({ where: eq(loans.userId, userId), orderBy: [desc(loans.createdAt)], limit: 5 }),
      db.query.incomeRecords.findMany({ where: eq(incomeRecords.userId, userId), orderBy: [desc(incomeRecords.receivedAt)], limit: 10 }),
      db.query.riskFlags.findMany({ where: eq(riskFlags.userId, userId), orderBy: [desc(riskFlags.createdAt)], limit: 10 })
    ]);

    const repaymentEvents = userLoans.length === 0
      ? []
      : await db.query.loanRepayments.findMany({
          where: inArray(loanRepayments.loanId, userLoans.map((loan) => loan.id)),
          orderBy: [desc(loanRepayments.dueDate)],
          limit: 12
        });

    return [
      ...scores.map((score) => ({
        type: "score.generated",
        at: score.generatedAt,
        payload: {
          score: score.score,
          confidence: score.confidence,
          occupation: score.inferredOccupation
        }
      })),
      ...userLoans.map((loan) => ({
        type: loan.status === "disbursed" || loan.status === "active" ? "loan.disbursed_to_employer" : "loan.approved",
        at: loan.disbursedAt ?? loan.approvedAt ?? loan.createdAt,
        payload: {
          amount: loan.amount,
          destination: loan.disbursementDestination,
          purpose: loan.purpose,
          status: loan.status
        }
      })),
      ...income.map((row) => ({
        type: "income.received_from_partner",
        at: row.receivedAt,
        payload: {
          amount: row.amount,
          employerName: row.employerName
        }
      })),
      ...repaymentEvents.map((row) => ({
        type: row.status === "paid" ? "repayment.debit_success" : row.status === "pending" ? "repayment.pending" : "repayment.debit_failed",
        at: row.paidAt ?? row.dueDate,
        payload: {
          amount: row.amount,
          installmentNumber: row.installmentNumber,
          status: row.status
        }
      })),
      ...flags.map((flag) => ({
        type: "pattern_break.flagged",
        at: flag.createdAt,
        payload: {
          severity: flag.severity,
          summary: flag.summary
        }
      }))
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
  }
};
