import { and, eq, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  bettingData,
  dataSources,
  employers,
  jobs,
  mobileMoneyTransactions,
  users
} from "../db/schema/index.js";
import { CANONICAL_IDS, CANONICAL_PHONES } from "../utils/canonical-data.js";
import { nairaToKobo } from "../utils/money.js";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildTundeBets() {
  return Array.from({ length: 36 }, (_, index) => ({
    id: crypto.randomUUID(),
    userId: CANONICAL_IDS.tunde,
    dataSourceId: "30000000-0000-0000-0000-000000000001",
    externalBetId: `sportybet-${index + 1}`,
    providerReference: `SB-REF-${index + 1}`,
    transactionDate: daysAgo(180 - index * 4),
    settledAt: daysAgo(179 - index * 4),
    betAmount: nairaToKobo(3500 + (index % 5) * 500),
    odds: (1.7 + (index % 3) * 0.2).toFixed(2),
    outcome: index % 4 === 0 ? "loss" : "win",
    payoutAmount: index % 4 === 0 ? null : nairaToKobo(7000 + (index % 3) * 1000),
    betType: index % 5 === 0 ? "accumulator" : "single",
    league: index % 2 === 0 ? "EPL" : "La Liga",
    rawPayload: JSON.stringify({ source: "seeded_demo", bookmaker: "sportybet" }),
    createdAt: new Date()
  }));
}

function buildTundeTransactions() {
  return Array.from({ length: 48 }, (_, index) => ({
    id: crypto.randomUUID(),
    userId: CANONICAL_IDS.tunde,
    dataSourceId: "30000000-0000-0000-0000-000000000002",
    externalTransactionId: `opay-${index + 1}`,
    providerReference: `OPAY-REF-${index + 1}`,
    transactionDate: daysAgo(170 - index * 3),
    transactionType: index % 6 === 0 ? "credit" : "debit",
    amount: index % 6 === 0 ? nairaToKobo(22000) : nairaToKobo(3500 + (index % 5) * 2000),
    balanceAfter: nairaToKobo(50000 - index * 500 + (index % 6 === 0 ? 15000 : -1000)),
    channel: index % 6 === 0 ? "transfer" : "wallet",
    recipient: index % 6 === 0 ? "Kwik Delivery Ltd" : `recipient_${index % 12}`,
    counterpartyName: index % 6 === 0 ? "Kwik Delivery Ltd" : `Recipient ${index % 12}`,
    counterpartyAccountRef: index % 6 === 0 ? `kwik-${index}` : `wallet-recipient-${index % 12}`,
    merchantCategory: index % 6 === 0 ? "salary" : ["transport", "groceries", "utilities", "airtime"][index % 4],
    description: index % 6 === 0 ? "weekly gig income" : "wallet activity",
    rawPayload: { source: "seeded_demo", provider: "opay" },
    createdAt: new Date()
  }));
}

function buildChiomaTransactions() {
  return Array.from({ length: 60 }, (_, index) => ({
    id: crypto.randomUUID(),
    userId: CANONICAL_IDS.chioma,
    dataSourceId: "30000000-0000-0000-0000-000000000003",
    externalTransactionId: `moniepoint-${index + 1}`,
    providerReference: `MP-REF-${index + 1}`,
    transactionDate: daysAgo(175 - index * 2),
    transactionType: index % 4 === 0 ? "credit" : "debit",
    amount: index % 4 === 0 ? nairaToKobo(18000 + (index % 3) * 4000) : nairaToKobo(4000 + (index % 6) * 1500),
    balanceAfter: nairaToKobo(65000 - index * 300 + (index % 4 === 0 ? 12000 : -800)),
    channel: index % 4 === 0 ? "bank_transfer" : "pos",
    recipient: index % 4 === 0 ? `customer_${index % 20}` : `supplier_${index % 8}`,
    counterpartyName: index % 4 === 0 ? `Customer ${index % 20}` : `Supplier ${index % 8}`,
    counterpartyAccountRef: index % 4 === 0 ? `cust-${index % 20}` : `supp-${index % 8}`,
    merchantCategory: index % 4 === 0 ? "retail_sales" : ["inventory", "transport", "utilities"][index % 3],
    description: index % 4 === 0 ? "market sales" : "business spend",
    rawPayload: { source: "seeded_demo", provider: "moniepoint" },
    createdAt: new Date()
  }));
}

function buildAminaTransactions() {
  return Array.from({ length: 8 }, (_, index) => ({
    id: crypto.randomUUID(),
    userId: CANONICAL_IDS.amina,
    dataSourceId: "30000000-0000-0000-0000-000000000004",
    externalTransactionId: `palmpay-${index + 1}`,
    providerReference: `PP-REF-${index + 1}`,
    transactionDate: daysAgo(45 - index * 5),
    transactionType: index % 3 === 0 ? "credit" : "debit",
    amount: index % 3 === 0 ? nairaToKobo(7000) : nairaToKobo(2500 + index * 250),
    balanceAfter: nairaToKobo(12000 - index * 600),
    channel: "wallet",
    recipient: `recipient_${index}`,
    counterpartyName: `Recipient ${index}`,
    counterpartyAccountRef: `wallet-recipient-${index}`,
    merchantCategory: index % 3 === 0 ? "personal_transfer" : "airtime",
    description: "thin file activity",
    rawPayload: { source: "seeded_demo", provider: "palmpay" },
    createdAt: new Date()
  }));
}

export const demoService = {
  async bootstrapCanonicalData() {
    const existing = await db.query.users.findMany({
      where: inArray(users.id, [CANONICAL_IDS.tunde, CANONICAL_IDS.chioma, CANONICAL_IDS.amina])
    });

    if (existing.length === 3) {
      return {
        bootstrapped: false,
        userIds: existing.map((user) => user.id)
      };
    }

    await db.insert(employers).values([
      {
        id: CANONICAL_IDS.kwikEmployer,
        name: "Kwik Delivery Ltd",
        squadAccountNumber: "1010101010",
        bankCode: "058",
        accountName: "Kwik Delivery Ltd",
        status: "active"
      },
      {
        id: CANONICAL_IDS.jumiaEmployer,
        name: "Jumia Partner Promotions",
        squadAccountNumber: "2020202020",
        bankCode: "058",
        accountName: "Jumia Partner Promotions",
        status: "active"
      }
    ]).onConflictDoNothing();

    await db.insert(jobs).values([
      {
        id: CANONICAL_IDS.kwikRiderJob,
        employerId: CANONICAL_IDS.kwikEmployer,
        title: "Delivery Rider",
        employer: "Kwik Delivery Ltd",
        category: "logistics",
        locationState: "Lagos",
        locationAreas: ["Yaba", "Lekki", "VI", "Ajah"],
        requirements: { smartphone: true, minDiscipline: 70, ageRange: [21, 40] },
        startupCosts: { bikeDeposit: nairaToKobo(85000), safetyGear: 0 },
        minimumIncome: nairaToKobo(120000),
        maximumIncome: nairaToKobo(180000),
        matchCriteriaWeights: { discipline: 0.4, location: 0.25, incomeOpportunity: 0.2, reliability: 0.15 },
        status: "active"
      },
      {
        id: CANONICAL_IDS.retailPromoterJob,
        employerId: CANONICAL_IDS.jumiaEmployer,
        title: "Field Sales Promoter",
        employer: "Jumia Partner Promotions",
        category: "sales",
        locationState: "Kano",
        locationAreas: ["Sabon Gari", "Fagge"],
        requirements: { smartphone: true, minCommercial: 65, ageRange: [20, 45] },
        startupCosts: { transportFloat: nairaToKobo(25000), smartphoneTopup: nairaToKobo(15000) },
        minimumIncome: nairaToKobo(90000),
        maximumIncome: nairaToKobo(140000),
        matchCriteriaWeights: { commercial: 0.45, location: 0.25, incomeOpportunity: 0.2, communication: 0.1 },
        status: "active"
      }
    ]).onConflictDoNothing();

    await db.insert(users).values([
      {
        id: CANONICAL_IDS.tunde,
        phone: CANONICAL_PHONES.tunde,
        phoneVerified: true,
        bvnVerified: true,
        name: "Tunde Adeyemi",
        state: "Lagos",
        occupation: "unemployed",
        monthlyIncome: nairaToKobo(80000)
      },
      {
        id: CANONICAL_IDS.chioma,
        phone: CANONICAL_PHONES.chioma,
        phoneVerified: true,
        bvnVerified: true,
        name: "Chioma Okafor",
        state: "Kano",
        occupation: "self_employed",
        monthlyIncome: nairaToKobo(100000)
      },
      {
        id: CANONICAL_IDS.amina,
        phone: CANONICAL_PHONES.amina,
        phoneVerified: true,
        bvnVerified: false,
        name: "Amina Bello",
        state: "Abuja",
        occupation: "unemployed",
        monthlyIncome: nairaToKobo(45000)
      }
    ]).onConflictDoNothing();

    await db.insert(dataSources).values([
      {
        id: "30000000-0000-0000-0000-000000000001",
        userId: CANONICAL_IDS.tunde,
        sourceType: "betting",
        sourceName: "SportyBet",
        providerCode: "sportybet",
        connectionMethod: "seeded_demo",
        status: "active"
      },
      {
        id: "30000000-0000-0000-0000-000000000002",
        userId: CANONICAL_IDS.tunde,
        sourceType: "mobile_money",
        sourceName: "Opay",
        providerCode: "opay",
        connectionMethod: "seeded_demo",
        status: "active"
      },
      {
        id: "30000000-0000-0000-0000-000000000003",
        userId: CANONICAL_IDS.chioma,
        sourceType: "mobile_money",
        sourceName: "Moniepoint",
        providerCode: "moniepoint",
        connectionMethod: "seeded_demo",
        status: "active"
      },
      {
        id: "30000000-0000-0000-0000-000000000004",
        userId: CANONICAL_IDS.amina,
        sourceType: "mobile_money",
        sourceName: "PalmPay",
        providerCode: "palmpay",
        connectionMethod: "seeded_demo",
        status: "active"
      }
    ]).onConflictDoNothing();

    const existingTundeBet = await db.query.bettingData.findFirst({
      where: eq(bettingData.userId, CANONICAL_IDS.tunde)
    });

    if (!existingTundeBet) {
      await db.insert(bettingData).values(buildTundeBets());
    }

    const existingTundeMomo = await db.query.mobileMoneyTransactions.findFirst({
      where: eq(mobileMoneyTransactions.userId, CANONICAL_IDS.tunde)
    });

    if (!existingTundeMomo) {
      await db.insert(mobileMoneyTransactions).values([
        ...buildTundeTransactions(),
        ...buildChiomaTransactions(),
        ...buildAminaTransactions()
      ]);
    }

    return {
      bootstrapped: true,
      userIds: [CANONICAL_IDS.tunde, CANONICAL_IDS.chioma, CANONICAL_IDS.amina]
    };
  }
};
