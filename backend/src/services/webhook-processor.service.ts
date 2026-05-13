import { and, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  incomeRecords,
  loanRepayments,
  loans,
  modelFeedbackEvents,
  riskFlags,
  squadWebhooks,
  users
} from "../db/schema/index.js";
import { decisionEngineService } from "./decision-engine.service.js";

type SquadEventPayload = {
  event_id: string;
  type: string;
  data: Record<string, unknown>;
};

export const webhookProcessorService = {
  async processSquadEvent(event: SquadEventPayload) {
    const existing = await db.query.squadWebhooks.findFirst({
      where: eq(squadWebhooks.eventId, event.event_id)
    });

    if (existing) {
      return { duplicated: true };
    }

    const [stored] = await db.insert(squadWebhooks).values({
      eventId: event.event_id,
      eventType: event.type,
      payload: event,
      processed: false
    }).returning();

    if (!stored) {
      throw new Error("Failed to persist webhook");
    }

    if (event.type === "loan.disbursed_to_employer") {
      const loanId = String(event.data.loanId);
      await db.update(loans).set({
        status: "active",
        disbursedAt: new Date(),
        disbursementReference: String(event.data.reference ?? event.event_id)
      }).where(eq(loans.id, loanId));
    }

    if (event.type === "income.received_from_partner") {
      const userId = String(event.data.userId);
      await db.insert(incomeRecords).values({
        userId,
        employerName: String(event.data.employerName ?? "Partner employer"),
        amount: Number(event.data.amount ?? 0),
        sourceReference: String(event.data.reference ?? event.event_id),
        sourceMetadata: event.data,
        receivedAt: new Date(String(event.data.receivedAt ?? new Date().toISOString()))
      });
      await db.insert(modelFeedbackEvents).values({
        userId,
        eventType: "job_income_verified",
        featureSnapshot: {},
        observedOutcome: event.data
      });
      await decisionEngineService.recalculateScore(userId);
    }

    if (event.type === "repayment.debit_success") {
      const loanId = String(event.data.loanId);
      const installmentNumber = Number(event.data.installmentNumber);
      const repayment = await db.query.loanRepayments.findFirst({
        where: and(eq(loanRepayments.loanId, loanId), eq(loanRepayments.installmentNumber, installmentNumber))
      });

      if (repayment) {
        await db.update(loanRepayments).set({
          status: "paid",
          paidAt: new Date(),
          squadReference: String(event.data.reference ?? event.event_id)
        }).where(eq(loanRepayments.id, repayment.id));
      }

      const loan = await db.query.loans.findFirst({ where: eq(loans.id, loanId) });
      if (loan) {
        await db.insert(modelFeedbackEvents).values({
          userId: loan.userId,
          loanId: loan.id,
          eventType: "repayment_on_time",
          featureSnapshot: {},
          observedOutcome: event.data
        });
        await decisionEngineService.recalculateScore(loan.userId);
      }
    }

    if (event.type === "repayment.debit_failed") {
      const loanId = String(event.data.loanId);
      const installmentNumber = Number(event.data.installmentNumber);
      const repayment = await db.query.loanRepayments.findFirst({
        where: and(eq(loanRepayments.loanId, loanId), eq(loanRepayments.installmentNumber, installmentNumber))
      });

      if (repayment) {
        await db.update(loanRepayments).set({
          status: "late",
          squadReference: String(event.data.reference ?? event.event_id)
        }).where(eq(loanRepayments.id, repayment.id));
      }

      const loan = await db.query.loans.findFirst({ where: eq(loans.id, loanId) });
      if (loan) {
        await db.insert(riskFlags).values({
          userId: loan.userId,
          source: "repayment",
          flagType: "debit_failed",
          severity: "medium",
          status: "open",
          summary: "Scheduled repayment failed and requires follow-up.",
          metadata: event.data
        });
      }
    }

    if (event.type === "pattern_break.flagged") {
      const userId = String(event.data.userId);
      await db.insert(riskFlags).values({
        userId,
        source: "squad",
        flagType: "pattern_break",
        severity: "high",
        status: "open",
        summary: String(event.data.summary ?? "Observed income pattern diverged from expected behavior."),
        metadata: event.data
      });
    }

    await db.update(squadWebhooks).set({
      processed: true,
      processedAt: new Date()
    }).where(eq(squadWebhooks.id, stored.id));

    return { duplicated: false, processed: true };
  },

  async replayCanonicalEvent(type: string, userId: string, loanId?: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      throw new Error("User not found");
    }

    const event_id = crypto.randomUUID();
    const base = {
      event_id,
      type,
      data: {
        userId
      }
    };

    if (type === "loan.disbursed_to_employer") {
      return this.processSquadEvent({
        ...base,
        data: {
          ...base.data,
          loanId,
          reference: `DISB-${Date.now()}`
        }
      });
    }

    if (type === "income.received_from_partner") {
      return this.processSquadEvent({
        ...base,
        data: {
          ...base.data,
          employerName: user.state === "Lagos" ? "Kwik Delivery Ltd" : "Jumia Partner Promotions",
          amount: user.state === "Lagos" ? 28000 : 22000,
          receivedAt: new Date().toISOString(),
          reference: `INC-${Date.now()}`
        }
      });
    }

    if (type === "repayment.debit_success" || type === "repayment.debit_failed") {
      return this.processSquadEvent({
        ...base,
        type,
        data: {
          ...base.data,
          loanId,
          installmentNumber: 1,
          reference: `RPM-${Date.now()}`
        }
      });
    }

    return this.processSquadEvent({
      ...base,
      type: "pattern_break.flagged",
      data: {
        ...base.data,
        summary: "Partner income source changed abruptly."
      }
    });
  }
};
