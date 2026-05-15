import { env } from "../config/env.js";
import { requestJson } from "../utils/http-client.js";
import { logger } from "../utils/logger.js";

// Mono wraps initiate responses in { status, data } but other endpoints return fields directly.

type MonoInitiateLinkResponse = {
  status?: string;
  data?: {
    mono_url?: string;
    customer?: string;
    meta?: { ref?: string };
    scope?: string;
    redirect_url?: string;
    created_at?: string;
  };
  // Fallback: older sandbox responses skip the wrapper
  mono_url?: string;
};

type MonoExchangeTokenResponse = {
  // v2 wrapped: { status, data: { id } }
  status?: string;
  data?: { id?: string };
  // v2 direct (some sandbox versions skip the wrapper)
  id?: string;
  // v1 fallback
  account?: { id?: string };
};

type MonoAccountDetailsResponse = {
  _id?: string;
  id?: string;
  name?: string;
  accountNumber?: string;
  account_number?: string;
  currency?: string;
  balance?: number;
  type?: string;
  bvn?: string;
  authMethod?: string;
  institution?: {
    name?: string;
    bankCode?: string;
    type?: string;
  };
  meta?: {
    data_status?: string;
    auth_method?: string;
    retrieved_data?: string[];
  };
};

type MonoTransactionsResponse = {
  data?: Array<Record<string, unknown>>;
  paging?: {
    next?: string | null;
  };
};

function monoHeaders(extra?: Record<string, string>) {
  return {
    "mono-sec-key": env.MONO_SECRET_KEY,
    ...extra
  };
}

export const monoConnectService = {
  async initiateAccountLink(params: {
    customerName: string;
    customerEmail: string;
    reference: string;
  }) {
    const raw = await requestJson<MonoInitiateLinkResponse>(`${env.MONO_BASE_URL}/v2/accounts/initiate`, {
      method: "POST",
      provider: "mono",
      headers: monoHeaders(),
      body: JSON.stringify({
        customer: {
          name: params.customerName,
          email: params.customerEmail
        },
        meta: {
          ref: params.reference
        },
        scope: "auth",
        redirect_url: env.MONO_REDIRECT_URL
      })
    });

    logger.info({ raw }, "Mono initiate account link raw response");

    // Unwrap { status, data } envelope — fall back to root if not wrapped
    const payload = raw.data ?? raw;
    const monoUrl = payload.mono_url ?? null;

    if (!monoUrl) {
      logger.warn({ raw }, "Mono initiate: mono_url missing from response");
    }

    return {
      reference: params.reference,
      monoUrl,
      requestId: params.reference
    };
  },

  async exchangeCode(code: string) {
    logger.info({ codePrefix: code.substring(0, 8) }, "Mono exchanging auth code");

    const response = await requestJson<MonoExchangeTokenResponse>(`${env.MONO_BASE_URL}/v2/accounts/auth`, {
      method: "POST",
      provider: "mono",
      headers: monoHeaders(),
      body: JSON.stringify({ code })
    });

    logger.info({ response }, "Mono exchange code raw response");

    return {
      accountId: response.data?.id ?? response.id ?? response.account?.id ?? null
    };
  },

  async getAccountDetails(accountId: string) {
    const response = await requestJson<MonoAccountDetailsResponse>(`${env.MONO_BASE_URL}/v2/accounts/${accountId}`, {
      method: "GET",
      provider: "mono",
      headers: monoHeaders(
        env.MONO_REALTIME_TRANSACTIONS ? { "x-real-time": "true" } : undefined
      )
    });

    logger.info({ accountId, response }, "Mono account details raw response");

    return response;
  },

  async getTransactions(accountId: string) {
    return requestJson<MonoTransactionsResponse>(`${env.MONO_BASE_URL}/v2/accounts/${accountId}/transactions?paginate=false`, {
      method: "GET",
      provider: "mono",
      headers: monoHeaders(
        env.MONO_REALTIME_TRANSACTIONS ? { "x-real-time": "true" } : undefined
      )
    });
  }
};
