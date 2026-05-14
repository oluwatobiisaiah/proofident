import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

type TokenPayload = {
  sub: string;
  type: "access" | "refresh";
  exp: number;
  iat: number;
  iss: string;
  ver: number;
  sid?: string;
};

function encode(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(token: string): TokenPayload {
  const [encodedBody, encodedSignature] = token.split(".");
  if (!encodedBody || !encodedSignature) {
    throw new Error("Malformed token");
  }

  const expectedSignature = createHmac("sha256", env.JWT_SECRET).update(encodedBody).digest("base64url");
  const provided = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8")) as TokenPayload;

  if (payload.iss !== env.JWT_ISSUER) {
    throw new Error("Invalid token issuer");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

export function issueAccessToken(userId: string, tokenVersion: number) {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    sub: userId,
    type: "access",
    iat: now,
    iss: env.JWT_ISSUER,
    ver: tokenVersion,
    exp: now + env.ACCESS_TOKEN_TTL_MINUTES * 60
  });
}

export function issueRefreshToken(userId: string, tokenVersion: number, sessionId: string) {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    sub: userId,
    type: "refresh",
    iat: now,
    iss: env.JWT_ISSUER,
    ver: tokenVersion,
    sid: sessionId,
    exp: now + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });
}

export function verifyToken(token: string, expectedType: TokenPayload["type"]) {
  const payload = decode(token);

  if (payload.type !== expectedType) {
    throw new Error("Invalid token type");
  }

  return payload;
}
