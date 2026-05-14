import { env } from "../config/env.js";
import { requestJson } from "../utils/http-client.js";

type TermiiResponse = {
  code?: string;
  message_id?: string;
  balance?: string;
  user?: string;
};

type SquadSmsResponse = {
  status?: number;
  success?: boolean;
  message?: string;
  data?: {
    success?: boolean;
    message?: string;
    data?: {
      batch_id?: string;
      sent?: Array<{
        phone_number?: string;
        status?: string;
        transaction_id?: string;
      }>;
      errors?: Array<unknown>;
      total_cost?: number;
      currency?: string;
    };
  };
};

async function sendWithTermii(phone: string, message: string) {
  const response = await requestJson<TermiiResponse>(`${env.TERMII_BASE_URL}/api/sms/send`, {
    method: "POST",
    provider: "termii",
    body: JSON.stringify({
      to: phone,
      from: env.TERMII_SENDER_ID,
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: env.TERMII_API_KEY
    })
  });

  return {
    phone,
    provider: "termii",
    messageId: response.message_id ?? null,
    responseCode: response.code ?? null
  };
}

async function sendWithSquad(phone: string, message: string) {
  const response = await requestJson<SquadSmsResponse>(`${env.SQUAD_BASE_URL}/sms/send/instant`, {
    method: "POST",
    provider: "squad",
    headers: {
      authorization: `Bearer ${env.SQUAD_SECRET_KEY}`
    },
    body: JSON.stringify({
      sender_id: env.SQUAD_SMS_SENDER_ID,
      messages: [
        {
          phone_number: phone,
          message
        }
      ]
    })
  });

  const firstSent = response.data?.data?.sent?.[0];

  return {
    phone,
    provider: "squad",
    messageId: firstSent?.transaction_id ?? response.data?.data?.batch_id ?? null,
    responseCode: response.status?.toString() ?? null
  };
}

export const smsService = {
  async sendOtp(phone: string, otp: string) {
    const message = `Your Proofident verification code is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes.`;

    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      return {
        phone,
        otp,
        provider: "dev"
      };
    }

    if (env.SMS_PROVIDER === "squad") {
      return sendWithSquad(phone, message);
    }

    return sendWithTermii(phone, message);
  }
};
