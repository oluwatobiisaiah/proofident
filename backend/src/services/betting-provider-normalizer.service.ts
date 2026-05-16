import { AppError } from "../utils/app-error.js";

type ProviderCode = "sportybet" | "bet9ja" | "1xbet" | "nairabet" | "opay" | "palmpay" | "moniepoint" | "kuda" | "sterling" | "other";

export type NormalizedBettingRecord = {
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

type RawDelimitedRow = Record<string, string>;

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new AppError(400, "CSV payload must include a header row and at least one data row", "BETTING_IMPORT_INVALID_CSV");
  }

  const header = splitCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return header.reduce<RawDelimitedRow>((row, key, index) => {
      row[key] = values[index] ?? "";
      return row;
    }, {});
  });
}

function toAmount(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(400, "Betting import contains an invalid amount", "BETTING_IMPORT_INVALID_AMOUNT");
  }
  return Math.round(parsed);
}

function toOptionalAmount(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}

function toOdds(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new AppError(400, "Betting import contains an invalid odds value", "BETTING_IMPORT_INVALID_ODDS");
  }
  return parsed;
}

function toOutcome(value: string | undefined): "win" | "loss" | "pending" {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["won", "win", "success", "successful"].includes(normalized)) {
    return "win";
  }

  if (["lost", "loss", "lose", "failed"].includes(normalized)) {
    return "loss";
  }

  return "pending";
}

function requireDate(value: string | undefined, field: string) {
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `Betting import contains an invalid ${field}`, "BETTING_IMPORT_INVALID_DATE");
  }
  return parsed.toISOString();
}

function maybeDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeSportyBetRow(row: RawDelimitedRow): NormalizedBettingRecord {
  return {
    externalBetId: row.bet_id || row.ticket_id || row.id || undefined,
    providerReference: row.reference || row.transaction_reference || undefined,
    transactionDate: requireDate(row.placed_at || row.bet_date || row.created_at, "placed date"),
    settledAt: maybeDate(row.settled_at || row.resolved_at),
    amount: toAmount(row.stake || row.amount),
    odds: toOdds(row.odds || row.total_odds),
    outcome: toOutcome(row.status || row.outcome),
    payout: toOptionalAmount(row.payout || row.winnings),
    betType: row.bet_type || row.type || undefined,
    league: row.league || row.competition || undefined,
    rawPayload: row
  };
}

function normalizeBet9jaRow(row: RawDelimitedRow): NormalizedBettingRecord {
  return {
    externalBetId: row["Coupon Code"] || row.coupon_code || row.bet_id || undefined,
    providerReference: row.Reference || row.reference || undefined,
    transactionDate: requireDate(row["Placed On"] || row.placed_on || row.date, "placed date"),
    settledAt: maybeDate(row["Settled On"] || row.settled_on),
    amount: toAmount(row.Stake || row.stake),
    odds: toOdds(row["Total Odds"] || row.total_odds || row.odds),
    outcome: toOutcome(row.Status || row.status),
    payout: toOptionalAmount(row.Winnings || row.winnings || row.payout),
    betType: row.Type || row.type || undefined,
    league: row.League || row.league || undefined,
    rawPayload: row
  };
}

function normalizeNairabetRow(row: RawDelimitedRow): NormalizedBettingRecord {
  return {
    externalBetId: row.bet_id || row.ticket_id || row.slip_id || row.id || undefined,
    providerReference: row.reference || row.transaction_reference || undefined,
    transactionDate: requireDate(row.placed_at || row.bet_date || row.date || row.created_at, "placed date"),
    settledAt: maybeDate(row.settled_at || row.resolved_at || row.updated_at),
    amount: toAmount(row.stake || row.amount),
    odds: toOdds(row.odds || row.total_odds),
    outcome: toOutcome(row.status || row.outcome || row.result),
    payout: toOptionalAmount(row.payout || row.winnings || row.return_amount),
    betType: row.bet_type || row.type || row.market || undefined,
    league: row.league || row.competition || row.sport || undefined,
    rawPayload: row
  };
}

function normalize1xBetRow(row: RawDelimitedRow): NormalizedBettingRecord {
  return {
    externalBetId: row["Bet ID"] || row.bet_id || row.id || undefined,
    providerReference: row.Reference || row.reference || undefined,
    transactionDate: requireDate(row.Date || row["Date/Time"] || row.date, "placed date"),
    settledAt: maybeDate(row["Settled At"] || row.settled_at),
    amount: toAmount(row.Stake || row.stake || row.Amount),
    odds: toOdds(row.Odds || row.odds || row.Coefficient),
    outcome: toOutcome(row.Status || row.status || row.Result),
    payout: toOptionalAmount(row.Payout || row.payout || row.Return),
    betType: row["Bet Type"] || row.bet_type || row.Type || undefined,
    league: row.League || row.league || undefined,
    rawPayload: row
  };
}

function normalizeGenericJsonRecord(input: Record<string, unknown>): NormalizedBettingRecord {
  return {
    externalBetId: typeof input.externalBetId === "string" ? input.externalBetId : typeof input.betId === "string" ? input.betId : undefined,
    providerReference: typeof input.providerReference === "string" ? input.providerReference : undefined,
    transactionDate: requireDate(typeof input.transactionDate === "string" ? input.transactionDate : typeof input.placedAt === "string" ? input.placedAt : undefined, "placed date"),
    settledAt: maybeDate(typeof input.settledAt === "string" ? input.settledAt : undefined),
    amount: toAmount(typeof input.amount === "number" ? input.amount : typeof input.stake === "number" ? input.stake : undefined),
    odds: toOdds(typeof input.odds === "number" ? input.odds : undefined),
    outcome: toOutcome(typeof input.outcome === "string" ? input.outcome : typeof input.status === "string" ? input.status : undefined),
    payout: toOptionalAmount(typeof input.payout === "number" ? input.payout : typeof input.winnings === "number" ? input.winnings : undefined),
    betType: typeof input.betType === "string" ? input.betType : undefined,
    league: typeof input.league === "string" ? input.league : undefined,
    rawPayload: input
  };
}

export const bettingProviderNormalizerService = {
  normalizeProviderPayload(params: {
    providerCode: ProviderCode;
    format: "csv" | "json";
    payload: string | Record<string, unknown>[];
  }) {
    if (params.format === "csv") {
      const rows = parseCsv(params.payload as string);

      switch (params.providerCode) {
        case "sportybet":
          return rows.map(normalizeSportyBetRow);
        case "bet9ja":
          return rows.map(normalizeBet9jaRow);
        case "1xbet":
          return rows.map(normalize1xBetRow);
        case "nairabet":
          return rows.map(normalizeNairabetRow);
        default:
          throw new AppError(400, `CSV import is not supported for provider: ${params.providerCode}`, "BETTING_IMPORT_PROVIDER_UNSUPPORTED");
      }
    }

    if (!Array.isArray(params.payload)) {
      throw new AppError(400, "JSON import payload must be an array of provider records", "BETTING_IMPORT_INVALID_JSON");
    }

    return params.payload.map((record) => normalizeGenericJsonRecord(record));
  }
};
