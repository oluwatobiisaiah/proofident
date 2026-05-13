import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

export const squadService = {
  verifyWebhookSignature(signature: string | undefined, payload: string) {
    if (!signature) {
      return env.NODE_ENV !== "production";
    }

    const expected = createHmac("sha256", env.SQUAD_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return expected === signature;
  }
};
