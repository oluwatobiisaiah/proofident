import { env } from "../config/env.js";
import { requestJson } from "../utils/http-client.js";

type MonoBvnInitiateResponse = {
  id?: string;
  session_id?: string;
  methods?: Array<{
    type?: string;
    phone_number?: string;
  }>;
  expires_at?: string;
};

type MonoBvnVerificationResponse = {
  verified?: boolean;
  status?: string;
};

type MonoBvnDetailsResponse = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  bvn?: string;
};

function monoHeaders(extra?: Record<string, string>) {
  return {
    authorization: `Bearer ${env.MONO_SECRET_KEY}`,
    ...extra
  };
}

export const bvnService = {
  async initiateVerification(bvn: string) {
    const response = await requestJson<MonoBvnInitiateResponse>(`${env.MONO_BASE_URL}/v2/lookup/bvn`, {
      method: "POST",
      provider: "mono",
      headers: monoHeaders(),
      body: JSON.stringify({ bvn })
    });

    return {
      providerSessionId: response.session_id ?? response.id ?? "",
      methods: response.methods ?? [],
      expiresAt: response.expires_at ? new Date(response.expires_at) : new Date(Date.now() + 10 * 60 * 1000)
    };
  },

  async verifyOtp(sessionId: string, otp: string, method?: string) {
    const response = await requestJson<MonoBvnVerificationResponse>(`${env.MONO_BASE_URL}/v2/lookup/bvn/verify`, {
      method: "POST",
      provider: "mono",
      headers: monoHeaders({ "x-session-id": sessionId }),
      body: JSON.stringify({
        otp,
        ...(method ? { method } : {})
      })
    });

    return {
      verified: response.verified ?? response.status === "verified"
    };
  },

  async getVerificationDetails(sessionId: string) {
    const response = await requestJson<MonoBvnDetailsResponse>(`${env.MONO_BASE_URL}/v2/lookup/bvn/details`, {
      method: "GET",
      provider: "mono",
      headers: monoHeaders({ "x-session-id": sessionId })
    });

    return {
      bvn: response.bvn,
      firstName: response.first_name,
      lastName: response.last_name,
      middleName: response.middle_name,
      dateOfBirth: response.date_of_birth,
      phoneNumber: response.phone_number
    };
  }
};
