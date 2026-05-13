import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

type TokenPayload = {
  sub: string;
  type: "access" | "refresh";
  exp: number;
};

function encode(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function issueAccessToken(userId: string) {
  return encode({
    sub: userId,
    type: "access",
    exp: Math.floor(Date.now() / 1000) + 60 * 15
  });
}

export function issueRefreshToken(userId: string) {
  return encode({
    sub: userId,
    type: "refresh",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  });
}
