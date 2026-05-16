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
      },
      {
        id: CANONICAL_IDS.maxEmployer,
        name: "MAX.ng",
        squadAccountNumber: "3030303030",
        bankCode: "058",
        accountName: "MAX NG Ltd",
        status: "active"
      },
      {
        id: CANONICAL_IDS.glovoEmployer,
        name: "Glovo Nigeria",
        squadAccountNumber: "4040404040",
        bankCode: "058",
        accountName: "Glovo Nigeria Ltd",
        status: "active"
      },
      {
        id: CANONICAL_IDS.palmpayEmployer,
        name: "PalmPay Agent Banking",
        squadAccountNumber: "5050505050",
        bankCode: "058",
        accountName: "PalmPay Ltd",
        status: "active"
      },
      {
        id: CANONICAL_IDS.monieEmployer,
        name: "Moniepoint POS Agent",
        squadAccountNumber: "6060606060",
        bankCode: "058",
        accountName: "Moniepoint MFB",
        status: "active"
      }
    ]).onConflictDoNothing();

    await db.insert(jobs).values([
      {
        id: CANONICAL_IDS.kwikRiderJob,
        employerId: CANONICAL_IDS.kwikEmployer,
        title: "Delivery Rider",
        description:
          "Join Kwik as a delivery rider and earn competitive weekly income by completing on-demand parcel deliveries across Lagos. You set your own hours and keep a high percentage of each delivery fee. A working smartphone and basic road knowledge are all you need to get started.",
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
        description:
          "Represent Jumia's partner brands at markets, shopping plazas, and community events in Kano. Earn a base stipend plus uncapped commissions for every customer you onboard to the Jumia platform. Ideal for outgoing individuals with strong local networks.",
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
      },
      {
        id: CANONICAL_IDS.maxDispatchJob,
        employerId: CANONICAL_IDS.maxEmployer,
        title: "Motorcycle Dispatch Rider",
        description:
          "MAX.ng equips you with a brand-new motorcycle on a rent-to-own plan, so zero capital is required upfront. Make daily deliveries for e-commerce and logistics partners across Lagos. Top riders can own their bike outright within 18 months.",
        employer: "MAX.ng",
        category: "logistics",
        locationState: "Lagos",
        locationAreas: ["Ikeja", "Surulere", "Oshodi", "Agege", "Ikorodu"],
        requirements: { motorcycle: true, minDiscipline: 65, ageRange: [20, 45] },
        startupCosts: { securityDeposit: nairaToKobo(30000) },
        minimumIncome: nairaToKobo(100000),
        maximumIncome: nairaToKobo(160000),
        matchCriteriaWeights: { discipline: 0.35, location: 0.3, incomeOpportunity: 0.2, reliability: 0.15 },
        status: "active"
      },
      {
        id: CANONICAL_IDS.glovoRiderJob,
        employerId: CANONICAL_IDS.glovoEmployer,
        title: "Food Delivery Partner",
        description:
          "Deliver meals from top restaurants in Abuja on your schedule — morning, afternoon, or evening shifts available. Glovo pays per delivery with a guaranteed minimum per active hour during peak times. Bicycle or motorcycle accepted.",
        employer: "Glovo Nigeria",
        category: "logistics",
        locationState: "Abuja",
        locationAreas: ["Wuse", "Garki", "Maitama", "Gwarinpa", "Utako"],
        requirements: { smartphone: true, minDiscipline: 60, ageRange: [18, 45] },
        startupCosts: { uniformDeposit: nairaToKobo(10000) },
        minimumIncome: nairaToKobo(80000),
        maximumIncome: nairaToKobo(130000),
        matchCriteriaWeights: { discipline: 0.35, location: 0.3, reliability: 0.25, incomeOpportunity: 0.1 },
        status: "active"
      },
      {
        id: CANONICAL_IDS.palmpayAgentJob,
        employerId: CANONICAL_IDS.palmpayEmployer,
        title: "PalmPay Banking Agent",
        description:
          "Operate a PalmPay agent point from your existing shop or kiosk. Earn commissions on every cash-in, cash-out, bill payment, and airtime transaction you process. PalmPay provides the POS device, branding, and ongoing training at no cost.",
        employer: "PalmPay Agent Banking",
        category: "fintech_agent",
        locationState: "Rivers",
        locationAreas: ["Port Harcourt GRA", "Rumuola", "Diobu", "Rumuokoro", "Eleme"],
        requirements: { existingShop: true, minCommercial: 55, ageRange: [22, 60] },
        startupCosts: { floatCapital: nairaToKobo(50000) },
        minimumIncome: nairaToKobo(60000),
        maximumIncome: nairaToKobo(120000),
        matchCriteriaWeights: { commercial: 0.4, reliability: 0.3, location: 0.2, incomeOpportunity: 0.1 },
        status: "active"
      },
      {
        id: CANONICAL_IDS.monieAgentJob,
        employerId: CANONICAL_IDS.monieEmployer,
        title: "Moniepoint POS Agent",
        description:
          "Become a Moniepoint agent and provide banking services — withdrawals, transfers, and bill payments — to underserved customers in your area. Earn transaction commissions daily. Moniepoint is the top-ranked merchant acquirer in Nigeria with a 99.7% uptime guarantee.",
        employer: "Moniepoint POS Agent",
        category: "fintech_agent",
        locationState: "Kano",
        locationAreas: ["Kano Municipal", "Nasarawa", "Gwale", "Tarauni", "Ungogo"],
        requirements: { existingShop: true, minCommercial: 60, ageRange: [22, 60] },
        startupCosts: { floatCapital: nairaToKobo(60000) },
        minimumIncome: nairaToKobo(70000),
        maximumIncome: nairaToKobo(130000),
        matchCriteriaWeights: { commercial: 0.45, reliability: 0.3, location: 0.15, incomeOpportunity: 0.1 },
        status: "active"
      },
      {
        id: CANONICAL_IDS.remoteAgentJob,
        employerId: null,
        title: "Remote Customer Support Agent",
        description:
          "Handle inbound chat and email support for Nigerian fintech and e-commerce brands from anywhere in Nigeria. Shifts are 8 hours, 5 days a week. Salary is paid monthly to your bank account. Laptop and stable internet required — a data stipend is provided.",
        employer: "TalentPlus Remote Work",
        category: "remote_work",
        locationState: "Nationwide",
        locationAreas: [],
        requirements: { laptop: true, internet: true, minCommercial: 50, ageRange: [20, 50] },
        startupCosts: {},
        minimumIncome: nairaToKobo(80000),
        maximumIncome: nairaToKobo(110000),
        matchCriteriaWeights: { communication: 0.4, reliability: 0.3, incomeOpportunity: 0.2, commercial: 0.1 },
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
