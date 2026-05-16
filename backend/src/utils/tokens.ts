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

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function encode(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${HEADER}.${body}`;
  const signature = createHmac("sha256", env.JWT_SECRET).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

function decode(token: string): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Malformed token");
  }
  const [encodedHeader, encodedBody, encodedSignature] = parts as [string, string, string];
  const signingInput = `${encodedHeader}.${encodedBody}`;

  const expectedSignature = createHmac("sha256", env.JWT_SECRET).update(signingInput).digest("base64url");
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
