import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { users } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { verifyToken } from "../utils/tokens.js";
import { eq } from "drizzle-orm";

function extractBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing bearer token", "AUTH_TOKEN_MISSING");
  }

  return header.slice("Bearer ".length).trim();
}

export async function authenticateRequest(request: FastifyRequest) {
  const token = extractBearerToken(request);

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token, "access");
  } catch {
    throw new AppError(401, "Invalid access token", "AUTH_TOKEN_INVALID");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub)
  });

  if (!user || user.tokenVersion !== payload.ver) {
    throw new AppError(401, "Session is no longer valid", "AUTH_SESSION_INVALID");
  }

  request.auth = {
    userId: user.id,
    tokenVersion: user.tokenVersion
  };
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  await authenticateRequest(request);
}

export function requireUserAccess(request: FastifyRequest, userId: string) {
  if (!request.auth || request.auth.userId !== userId) {
    throw new AppError(403, "You cannot access this resource", "AUTH_FORBIDDEN");
  }
}
