import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { requestJson } from "../utils/http-client.js";

export const squadService = {
  verifyWebhookSignature(signature: string | undefined, payload: string) {
    if (!signature) {
      return env.NODE_ENV !== "production";
    }

    const expected = createHmac("sha256", env.SQUAD_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    const provided = Buffer.from(signature);
    const calculated = Buffer.from(expected);

    return provided.length === calculated.length && timingSafeEqual(provided, calculated);
  },

  async createVirtualAccount(params: {
    customerIdentifier: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) {
    const response = await requestJson<{
      data?: {
        virtual_account_number?: string;
        customer_identifier?: string;
      };
    }>(`${env.SQUAD_BASE_URL}/virtual-account`, {
      method: "POST",
      provider: "squad",
      headers: {
        authorization: `Bearer ${env.SQUAD_SECRET_KEY}`
      },
      body: JSON.stringify({
        merchant_id: env.SQUAD_MERCHANT_ID,
        customer_identifier: params.customerIdentifier,
        first_name: params.firstName,
        last_name: params.lastName,
        mobile_num: params.phoneNumber
      })
    });

    return {
      accountNumber: response.data?.virtual_account_number ?? null,
      customerIdentifier: response.data?.customer_identifier ?? params.customerIdentifier
    };
  },

  async disburseToBankAccount(params: {
    amount: number;
    accountNumber: string;
    bankCode?: string | null;
    accountName: string;
    reference: string;
    narration: string;
  }) {
    const response = await requestJson<{
      data?: {
        transaction_ref?: string;
        status?: string;
      };
    }>(`${env.SQUAD_BASE_URL}/transfer`, {
      method: "POST",
      provider: "squad",
      headers: {
        authorization: `Bearer ${env.SQUAD_SECRET_KEY}`
      },
      body: JSON.stringify({
        account_number: params.accountNumber,
        bank_code: params.bankCode ?? env.SQUAD_DEFAULT_BANK_CODE,
        account_name: params.accountName,
        amount: params.amount,
        reference: params.reference,
        currency: "NGN",
        narration: params.narration
      })
    });

    return {
      reference: response.data?.transaction_ref ?? params.reference,
      status: response.data?.status ?? "pending"
    };
  }
};
