import { User } from "@/app/api/auth/[...nextauth]/route";
import { ProofidentFormData } from "./schemas";
import { NEXT_PUBLIC_API_URL } from "@/lib/envVariables";
import { nanoid } from "nanoid";

export interface InitiateBVNRequestSuccess {
  success: true;
  sessionId: string;
  methods: [
    {
      type: "otp";
      phone_number: string;
    },
  ];
  expiresAt: string;
}

export interface VerifyBVNSuccess {
  success: true;
  user: User;
}

export interface BettingUploadSuccess {
  success: true;
  dataSourceId: string;
  ingestionSessionId: string;
  extractionJobId: string;
  filesUploaded: number;
}

export async function InitiateBVNRequest(
  data: Pick<ProofidentFormData, "bvn">,
  accessToken: string,
): Promise<InitiateBVNRequestSuccess> {
  const reqId = nanoid();
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/bvn/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `bvn-initiate-${reqId}`,
    },
    body: JSON.stringify({ bvn: data.bvn }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error || body?.message || "BVN Initiation request failed",
    );
  }

  const body = await res.json();

  return body as InitiateBVNRequestSuccess;
}

export async function verifyBVN(
  data: Pick<ProofidentFormData, "bvn" | "bvnOtp" | "dateOfBirth">,
  accessToken: string,
  sessionId: string,
): Promise<VerifyBVNSuccess> {
  const reqId = nanoid();
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/bvn/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `verify-bvn-${reqId}`,
    },
    body: JSON.stringify({
      sessionId,
      bvn: data.bvn,
      otp: data.bvnOtp,
      method: "sms",
      dateOfBirth: data.dateOfBirth,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error || body?.message || "BVN Verification request failed",
    );
  }

  const body = await res.json();

  return body as VerifyBVNSuccess;
}

export type BettingUploadKind = "screenshot" | "csv";

export async function uploadBettingFiles(
  providerCode: string,
  files: File[],
  accessToken: string,
  uploadKind: BettingUploadKind = "screenshot",
): Promise<void> {
  const formData = new FormData();

  formData.append("providerCode", providerCode);
  formData.append("uploadKind", uploadKind);
  files.forEach((file) => formData.append("file", file));

  const res = await fetch(
    `${NEXT_PUBLIC_API_URL}/me/data-sources/betting/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Do NOT set Content-Type here — the browser sets it automatically
        // with the correct multipart boundary when using FormData
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error || body?.message || "Betting file upload failed",
    );
  }

  const body = await res.json();
  return body;
}
