import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  bettingData,
  dataSources,
  ingestionSessions,
  mobileMoneyTransactions,
  users
} from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { auditService } from "./audit.service.js";
import { monoConnectService } from "./mono-connect.service.js";
import { scoreService } from "./score.service.js";

type SourceType = "betting" | "mobile_money" | "telco" | "self_declared";
type ProviderCode = "sportybet" | "bet9ja" | "1xbet" | "nairabet" | "opay" | "palmpay" | "moniepoint" | "kuda" | "sterling" | "other";

type MonoTransactionRecord = Record<string, unknown>;

type ManualBettingRecord = {
  externalBetId?: string | undefined;
  providerReference?: string | undefined;
  transactionDate: string;
  settledAt?: string | undefined;
  amount: number;
  odds: number;
  outcome: "win" | "loss" | "pending";
  payout?: number | undefined;
  betType?: string | undefined;
  league?: string | undefined;
  rawPayload?: Record<string, unknown> | undefined;
};

type ManualMobileMoneyRecord = {
  externalTransactionId?: string | undefined;
  providerReference?: string | undefined;
  transactionDate: string;
  transactionType: "credit" | "debit";
  transactionStatus?: "pending" | "successful" | "failed" | "reversed" | "cancelled" | undefined;
  amount: number;
  balanceAfter?: number | undefined;
  currency?: string | undefined;
  channel?: string | undefined;
  recipient?: string | undefined;
  counterpartyName?: string | undefined;
  counterpartyAccountRef?: string | undefined;
  merchantCategory?: string | undefined;
  description?: string | undefined;
  rawPayload?: Record<string, unknown> | undefined;
};

function normalizeTransactionType(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  return text === "debit" ? "debit" : "credit";
}

function normalizeTransactionStatus(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text === "failed") return "failed" as const;
  if (text === "reversed") return "reversed" as const;
  if (text === "cancelled") return "cancelled" as const;
  if (text === "pending") return "pending" as const;
  return "successful" as const;
}

function extractMonoNarration(transaction: MonoTransactionRecord) {
  const narration = transaction.narration;
  return typeof narration === "string" ? narration : undefined;
}

function toDate(value: unknown, fallback = new Date()) {
  const parsed = new Date(String(value ?? fallback.toISOString()));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

async function ensureSourceOwnership(userId: string, dataSourceId: string) {
  const source = await db.query.dataSources.findFirst({
    where: and(eq(dataSources.id, dataSourceId), eq(dataSources.userId, userId))
  });

  if (!source) {
    throw new AppError(404, "Data source not found", "DATA_SOURCE_NOT_FOUND");
  }

  return source;
}

export const ingestionService = {
  async initiateMonoLink(userId: string, sourceType: SourceType, providerCode: ProviderCode) {
    if (sourceType !== "mobile_money") {
      throw new AppError(400, "Mono account linking is currently supported for financial account data only", "PROVIDER_NOT_SUPPORTED");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const name = user.name?.trim();

    if (!name) {
      throw new AppError(400, "BVN verification is required before linking a bank account — your name must be confirmed first", "PROFILE_INCOMPLETE");
    }

    // Email is optional for account linking; fall back to a derived placeholder if unset
    const email = user.email?.trim() || `user-${userId.substring(0, 8)}@proofident.app`;

    const reference = `mono-${userId}-${Date.now()}`;
    const link = await monoConnectService.initiateAccountLink({
      customerName: name,
      customerEmail: email,
      reference
    });

    await auditService.record({
      actorUserId: userId,
      action: "data_source.link.initiated",
      resourceType: "data_source",
      status: "pending",
      metadata: {
        sourceType,
        providerCode,
        reference
      }
    });

    return {
      provider: "mono",
      sourceType,
      providerCode,
      ...link
    };
  },

  async completeMonoLink(params: {
    userId: string;
    sourceType: SourceType;
    providerCode: ProviderCode;
    code: string;
  }) {
    if (params.sourceType !== "mobile_money") {
      throw new AppError(400, "Mono account linking is currently supported for financial account data only", "PROVIDER_NOT_SUPPORTED");
    }

    const exchanged = await monoConnectService.exchangeCode(params.code);

    if (!exchanged.accountId) {
      throw new AppError(502, "Mono did not return an account identifier", "MONO_ACCOUNT_ID_MISSING");
    }

    const accountDetails = await monoConnectService.getAccountDetails(exchanged.accountId);
    const institutionName = accountDetails.institution?.name ?? "Mono Connected Account";

    const metadata = {
      accountName: accountDetails.name ?? null,
      accountNumber: accountDetails.accountNumber ?? accountDetails.account_number ?? null,
      accountType: accountDetails.type ?? null,
      institution: accountDetails.institution ?? null,
      dataStatus: accountDetails.meta?.data_status ?? null,
      retrievedData: accountDetails.meta?.retrieved_data ?? []
    };

    const existing = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.userId, params.userId),
        eq(dataSources.sourceType, params.sourceType),
        eq(dataSources.providerAccountRef, exchanged.accountId)
      )
    });

    const [source] = existing
      ? await db.update(dataSources).set({
          sourceName: institutionName,
          providerCode: params.providerCode,
          connectionMethod: "oauth",
          consentReference: params.code,
          metadata,
          status: "active",
          lastSyncedAt: new Date()
        }).where(eq(dataSources.id, existing.id)).returning()
      : await db.insert(dataSources).values({
          userId: params.userId,
          sourceType: params.sourceType,
          sourceName: institutionName,
          providerCode: params.providerCode,
          connectionMethod: "oauth",
          providerAccountRef: exchanged.accountId,
          consentReference: params.code,
          metadata,
          status: "active",
          lastSyncedAt: new Date()
        }).returning();

    if (!source) {
      throw new AppError(500, "Failed to create connected data source", "DATA_SOURCE_CREATE_FAILED");
    }

    const sync = await this.syncMobileMoneySource(params.userId, source.id);
    return { dataSource: source, sync };
  },

  async syncMobileMoneySource(userId: string, dataSourceId: string) {
    const source = await ensureSourceOwnership(userId, dataSourceId);

    if (!source.providerAccountRef) {
      throw new AppError(400, "Data source is missing provider account reference", "DATA_SOURCE_NOT_LINKED");
    }

    const [session] = await db.insert(ingestionSessions).values({
      userId,
      dataSourceId: source.id,
      sourceType: source.sourceType,
      ingestionMethod: source.connectionMethod,
      status: "validating",
      validationSummary: {
        provider: "mono",
        providerCode: source.providerCode
      }
    }).returning();

    if (!session) {
      throw new AppError(500, "Failed to create ingestion session", "INGESTION_CREATE_FAILED");
    }

    const transactions = await monoConnectService.getTransactions(source.providerAccountRef);
    const records = Array.isArray(transactions.data) ? transactions.data : [];

    if (records.length > 0) {
      await db.insert(mobileMoneyTransactions).values(
        records.map((txn): typeof mobileMoneyTransactions.$inferInsert => ({
          userId,
          dataSourceId: source.id,
          externalTransactionId: typeof txn.id === "string" ? txn.id : typeof txn._id === "string" ? txn._id : null,
          providerReference: typeof txn.reference === "string" ? txn.reference : null,
          transactionDate: toDate(txn.date),
          transactionType: normalizeTransactionType(txn.type),
          transactionStatus: normalizeTransactionStatus(txn.status),
          amount: Number(txn.amount ?? 0),
          balanceAfter: typeof txn.balance === "number" ? txn.balance : typeof txn.balance_after === "number" ? txn.balance_after : null,
          currency: typeof txn.currency === "string" ? txn.currency : "NGN",
          channel: typeof txn.channel === "string" ? txn.channel : typeof txn.type === "string" ? txn.type : null,
          recipient: extractMonoNarration(txn) ?? null,
          counterpartyName: typeof txn.counterparty === "object" && txn.counterparty && "name" in txn.counterparty
            ? String((txn.counterparty as Record<string, unknown>).name ?? "")
            : null,
          counterpartyAccountRef: typeof txn.counterparty === "object" && txn.counterparty && "account_number" in txn.counterparty
            ? String((txn.counterparty as Record<string, unknown>).account_number ?? "")
            : null,
          merchantCategory: typeof txn.category === "string" ? txn.category : null,
          description: extractMonoNarration(txn) ?? null,
          rawPayload: txn
        }))
      ).onConflictDoNothing();
    }

    await db.update(dataSources).set({
      lastSyncedAt: new Date(),
      status: "active",
      metadata: {
        ...(source.metadata as Record<string, unknown>),
        lastSyncRecordCount: records.length,
        lastSyncAt: new Date().toISOString()
      }
    }).where(eq(dataSources.id, source.id));

    await db.update(ingestionSessions).set({
      status: "ready_for_scoring",
      recordCount: records.length,
      acceptedCount: records.length,
      rejectedCount: 0,
      completedAt: new Date(),
      validationSummary: {
        provider: "mono",
        providerCode: source.providerCode,
        syncedRecords: records.length
      }
    }).where(eq(ingestionSessions.id, session.id));

    const score = await scoreService.recalculate(userId);
    if (!score) {
      throw new AppError(500, "Failed to refresh score after sync", "SCORE_RECALCULATION_FAILED");
    }

    await auditService.record({
      actorUserId: userId,
      action: "data_source.sync.completed",
      resourceType: "data_source",
      resourceId: source.id,
      status: "success",
      metadata: {
        sourceType: source.sourceType,
        providerCode: source.providerCode,
        records: records.length
      }
    });

    return {
      ingestionId: session.id,
      recordsSynced: records.length,
      scoreId: score.id
    };
  },

  async importManualBettingRecords(userId: string, providerCode: ProviderCode, records: ManualBettingRecord[]) {
    const existingSource = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.userId, userId),
        eq(dataSources.sourceType, "betting"),
        eq(dataSources.providerCode, providerCode),
        eq(dataSources.connectionMethod, "manual_upload")
      )
    });

    let source: typeof dataSources.$inferSelect;
    if (existingSource) {
      source = existingSource;
    } else {
      const [created] = await db.insert(dataSources).values({
        userId,
        sourceType: "betting",
        sourceName: providerCode,
        providerCode,
        connectionMethod: "manual_upload",
        status: "active",
        lastSyncedAt: new Date(),
        metadata: {
          importMode: "manual_records"
        }
      }).returning();
      if (!created) {
        throw new AppError(500, "Failed to create betting data source", "DATA_SOURCE_CREATE_FAILED");
      }
      source = created;
    }

    const [session] = await db.insert(ingestionSessions).values({
      userId,
      dataSourceId: source.id,
      sourceType: "betting",
      ingestionMethod: "manual_upload",
      status: "parsed",
      validationSummary: {
        providerCode,
        importMode: "manual_records"
      }
    }).returning();

    if (!session) {
      throw new AppError(500, "Failed to create ingestion session", "INGESTION_CREATE_FAILED");
    }

    await db.insert(bettingData).values(
      records.map((record): typeof bettingData.$inferInsert => ({
        userId,
        dataSourceId: source.id,
        externalBetId: record.externalBetId ?? null,
        providerReference: record.providerReference ?? null,
        transactionDate: toDate(record.transactionDate),
        settledAt: record.settledAt ? toDate(record.settledAt) : null,
        betAmount: record.amount,
        odds: record.odds.toFixed(2),
        outcome: record.outcome,
        payoutAmount: record.payout ?? null,
        betType: record.betType ?? "single",
        league: record.league ?? null,
        rawPayload: record.rawPayload ? JSON.stringify(record.rawPayload) : null
      }))
    );

    await db.update(ingestionSessions).set({
      status: "ready_for_scoring",
      recordCount: records.length,
      acceptedCount: records.length,
      rejectedCount: 0,
      completedAt: new Date()
    }).where(eq(ingestionSessions.id, session.id));

    const score = await scoreService.recalculate(userId);
    if (!score) {
      throw new AppError(500, "Failed to refresh score after betting import", "SCORE_RECALCULATION_FAILED");
    }
    return { dataSourceId: source.id, ingestionId: session.id, recordsImported: records.length, scoreId: score.id };
  },

  async importManualMobileMoneyRecords(userId: string, providerCode: ProviderCode, records: ManualMobileMoneyRecord[]) {
    const existingSource = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.userId, userId),
        eq(dataSources.sourceType, "mobile_money"),
        eq(dataSources.providerCode, providerCode),
        eq(dataSources.connectionMethod, "manual_upload")
      )
    });

    let source: typeof dataSources.$inferSelect;
    if (existingSource) {
      source = existingSource;
    } else {
      const [created] = await db.insert(dataSources).values({
        userId,
        sourceType: "mobile_money",
        sourceName: providerCode,
        providerCode,
        connectionMethod: "manual_upload",
        status: "active",
        lastSyncedAt: new Date(),
        metadata: {
          importMode: "manual_records"
        }
      }).returning();
      if (!created) {
        throw new AppError(500, "Failed to create mobile money data source", "DATA_SOURCE_CREATE_FAILED");
      }
      source = created;
    }

    const [session] = await db.insert(ingestionSessions).values({
      userId,
      dataSourceId: source.id,
      sourceType: "mobile_money",
      ingestionMethod: "manual_upload",
      status: "parsed",
      validationSummary: {
        providerCode,
        importMode: "manual_records"
      }
    }).returning();

    if (!session) {
      throw new AppError(500, "Failed to create ingestion session", "INGESTION_CREATE_FAILED");
    }

    await db.insert(mobileMoneyTransactions).values(
      records.map((record): typeof mobileMoneyTransactions.$inferInsert => ({
        userId,
        dataSourceId: source.id,
        externalTransactionId: record.externalTransactionId ?? null,
        providerReference: record.providerReference ?? null,
        transactionDate: toDate(record.transactionDate),
        transactionType: record.transactionType,
        transactionStatus: record.transactionStatus ?? "successful",
        amount: record.amount,
        balanceAfter: record.balanceAfter ?? null,
        currency: record.currency ?? "NGN",
        channel: record.channel ?? null,
        recipient: record.recipient ?? null,
        counterpartyName: record.counterpartyName ?? null,
        counterpartyAccountRef: record.counterpartyAccountRef ?? null,
        merchantCategory: record.merchantCategory ?? null,
        description: record.description ?? null,
        rawPayload: record.rawPayload ?? {}
      }))
    );

    await db.update(ingestionSessions).set({
      status: "ready_for_scoring",
      recordCount: records.length,
      acceptedCount: records.length,
      rejectedCount: 0,
      completedAt: new Date()
    }).where(eq(ingestionSessions.id, session.id));

    const score = await scoreService.recalculate(userId);
    if (!score) {
      throw new AppError(500, "Failed to refresh score after mobile money import", "SCORE_RECALCULATION_FAILED");
    }
    return { dataSourceId: source.id, ingestionId: session.id, recordsImported: records.length, scoreId: score.id };
  },

  async getLatestIngestionForSource(userId: string, dataSourceId: string) {
    await ensureSourceOwnership(userId, dataSourceId);
    return db.query.ingestionSessions.findFirst({
      where: eq(ingestionSessions.dataSourceId, dataSourceId),
      orderBy: [desc(ingestionSessions.startedAt)]
    });
  }
};
