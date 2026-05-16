import { WelcomeFormData, WelcomePhoneData } from "@/lib/welcome/schema";
import { NEXT_PUBLIC_API_URL } from "@/lib/envVariables";
import { nanoid } from "nanoid";

export interface OTPStepData {
  success: boolean;
  message: string;
  expiresAt: string;
  devOtp: string;
}

export async function sendOTP(
  data: Pick<WelcomeFormData, "phone">,
): Promise<OTPStepData> {
  const reqId = nanoid();
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `send-otp-${reqId}`,
    },
    body: JSON.stringify({ phone: data.phone.replace(/\s/g, "") }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || body?.message || "Login request failed");
  }

  const body = await res.json();
  return body as OTPStepData;
}