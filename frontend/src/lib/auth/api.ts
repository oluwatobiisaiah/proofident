import { NEXT_PUBLIC_API_URL } from "@/lib/envVariables";
import { nanoid } from "nanoid"; 


export async function logOutExistingUser(refreshToken: string) {
  const reqId = nanoid();
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Length": "application/json" , "Idempotency-Key": `logout-${reqId}`},
    body: JSON.stringify({ refreshToken: refreshToken }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || body?.message || "Logout request failed");
  }
  return true;
}