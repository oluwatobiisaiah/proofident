import { env } from "../config/env.js";
import { requestJson } from "../utils/http-client.js";

type MonoInitiateLinkResponse = {
  id?: string;
  mono_url?: string;
  monoUrl?: string;
};

type MonoExchangeTokenResponse = {
  id?: string;
  account?: {
    id?: string;
  };
};

type MonoAccountDetailsResponse = {
  id?: string;
  name?: string;
  account?: {
    name?: string;
    number?: string;
    type?: string;
    currency?: string;
    balance?: number;
  };
  institution?: {
    name?: string;
    bankCode?: string;
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
    const response = await requestJson<MonoInitiateLinkResponse>(`${env.MONO_BASE_URL}/v2/accounts/initiate`, {
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

    return {
      reference: params.reference,
      monoUrl: response.mono_url ?? response.monoUrl ?? null,
      requestId: response.id ?? null
    };
  },

  async exchangeCode(code: string) {
    const response = await requestJson<MonoExchangeTokenResponse>(`${env.MONO_BASE_URL}/v2/accounts/auth`, {
      method: "POST",
      provider: "mono",
      headers: monoHeaders(),
      body: JSON.stringify({ code })
    });

    return {
      accountId: response.account?.id ?? response.id ?? null
    };
  },

  async getAccountDetails(accountId: string) {
    return requestJson<MonoAccountDetailsResponse>(`${env.MONO_BASE_URL}/v2/accounts/${accountId}`, {
      method: "GET",
      provider: "mono",
      headers: monoHeaders(
        env.MONO_REALTIME_TRANSACTIONS ? { "x-real-time": "true" } : undefined
      )
    });
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
