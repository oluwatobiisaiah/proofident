import { randomInt } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../config/database.js";
import { bvnVerificationSessions, otpVerifications, refreshSessions, users } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { hashValue, normalizePhone, safeEqual } from "../utils/security.js";
import { issueAccessToken, issueRefreshToken, verifyToken } from "../utils/tokens.js";
import { auditService } from "./audit.service.js";
import { bvnService } from "./bvn.service.js";
import { logger } from "../utils/logger.js";
import { userService } from "./user.service.js";

function generateOtp() {
  return String(randomInt(100000, 999999));
}

export const authService = {
  async sendOtp(phone: string, metadata?: { ipAddress?: string | null; userAgent?: string | null }) {
    const normalizedPhone = normalizePhone(phone);
    const latest = await db.query.otpVerifications.findFirst({
      where: eq(otpVerifications.phone, normalizedPhone),
      orderBy: [desc(otpVerifications.createdAt)]
    });

    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000 &&
      latest.expiresAt.getTime() > Date.now()
    ) {
      throw new AppError(429, "OTP recently sent. Please wait before requesting another code.", "OTP_RESEND_COOLDOWN");
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

    await db.insert(otpVerifications).values({
      phone: normalizedPhone,
      otpCode: hashValue(otp, "otp"),
      expiresAt
    });

    await auditService.record({
      action: "auth.otp.sent",
      resourceType: "otp_verification",
      status: "pending",
      ipAddress: metadata?.ipAddress ?? null,
      metadata: {
        phone: normalizedPhone,
        userAgent: metadata?.userAgent ?? null
      }
    });

    return {
      phone: normalizedPhone,
      otp,
      expiresAt
    };
  },

  async verifyOtp(phone: string, otp: string, metadata?: { ipAddress?: string | null; userAgent?: string | null }) {
    const normalizedPhone = normalizePhone(phone);
    const record = await db.query.otpVerifications.findFirst({
      where: eq(otpVerifications.phone, normalizedPhone),
      orderBy: [desc(otpVerifications.createdAt)]
    });

    if (!record) {
      throw new AppError(400, "OTP not found", "OTP_NOT_FOUND");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError(400, "OTP expired", "OTP_EXPIRED");
    }

    if (record.verified) {
      throw new AppError(400, "OTP has already been used", "OTP_ALREADY_USED");
    }

    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError(429, "Maximum OTP attempts exceeded", "OTP_ATTEMPTS_EXCEEDED");
    }

    const updatedAttempts = record.attempts + 1;

    if (!safeEqual(record.otpCode, hashValue(otp, "otp"))) {
      await db
        .update(otpVerifications)
        .set({ attempts: updatedAttempts })
        .where(eq(otpVerifications.id, record.id));

      throw new AppError(400, "Invalid OTP", "OTP_INVALID");
    }

    await db
      .update(otpVerifications)
      .set({ verified: true, attempts: updatedAttempts })
      .where(eq(otpVerifications.id, record.id));

    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, normalizedPhone)
    });
    const refreshSessionId = crypto.randomUUID();
    const refreshSessionExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    if (existingUser) {
      await db.insert(refreshSessions).values({
        id: refreshSessionId,
        userId: existingUser.id,
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
        expiresAt: refreshSessionExpiresAt,
        lastUsedAt: new Date()
      });

      await auditService.record({
        actorUserId: existingUser.id,
        action: "auth.login",
        resourceType: "user",
        resourceId: existingUser.id,
        status: "success",
        ipAddress: metadata?.ipAddress ?? null
      });

      return {
        user: existingUser,
        accessToken: issueAccessToken(existingUser.id, existingUser.tokenVersion),
        refreshToken: issueRefreshToken(existingUser.id, existingUser.tokenVersion, refreshSessionId)
      };
    }

    const [newUser] = await db
      .insert(users)
      .values({
        phone: normalizedPhone,
        phoneVerified: true
      })
      .returning();

    if (!newUser) {
      throw new AppError(500, "Failed to create user", "USER_CREATE_FAILED");
    }

    await db.insert(refreshSessions).values({
      id: refreshSessionId,
      userId: newUser.id,
      userAgent: metadata?.userAgent ?? null,
      ipAddress: metadata?.ipAddress ?? null,
      expiresAt: refreshSessionExpiresAt,
      lastUsedAt: new Date()
    });

    await auditService.record({
      actorUserId: newUser.id,
      action: "auth.register",
      resourceType: "user",
      resourceId: newUser.id,
      status: "success",
      ipAddress: metadata?.ipAddress ?? null
    });

    return {
      user: newUser,
      accessToken: issueAccessToken(newUser.id, newUser.tokenVersion),
      refreshToken: issueRefreshToken(newUser.id, newUser.tokenVersion, refreshSessionId)
    };
  },

  async initiateBvnVerification(userId: string, bvn: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const initiated = await bvnService.initiateVerification(bvn);
    const [session] = await db.insert(bvnVerificationSessions).values({
      userId,
      bvnHash: hashValue(bvn, "bvn"),
      providerSessionId: initiated.providerSessionId,
      challengePayload: {
        methods: initiated.methods
      },
      expiresAt: initiated.expiresAt
    }).returning();

    await auditService.record({
      actorUserId: userId,
      action: "kyc.bvn.initiated",
      resourceType: "bvn_verification_session",
      resourceId: session?.id ?? null,
      status: "pending"
    });

    return {
      sessionId: session?.id,
      methods: initiated.methods,
      expiresAt: initiated.expiresAt
    };
  },

  async verifyBvn(userId: string, sessionId: string, otp: string, dateOfBirth?: string, method?: string) {
    const session = await db.query.bvnVerificationSessions.findFirst({
      where: and(
        eq(bvnVerificationSessions.id, sessionId),
        eq(bvnVerificationSessions.userId, userId),
        isNull(bvnVerificationSessions.completedAt)
      )
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "BVN verification session expired or not found", "BVN_SESSION_INVALID");
    }

    const verification = await bvnService.verifyOtp(session.providerSessionId, otp, method);

    if (!verification.verified) {
      throw new AppError(400, "BVN verification failed", "BVN_VERIFICATION_FAILED");
    }

    const details = await bvnService.getVerificationDetails(session.providerSessionId);

    if (dateOfBirth && details.dateOfBirth && details.dateOfBirth !== dateOfBirth) {
      throw new AppError(400, "BVN date of birth does not match the supplied record", "BVN_DOB_MISMATCH");
    }

    const [updated] = await db.update(users).set({
      bvn: details.bvn ? hashValue(details.bvn, "bvn") : session.bvnHash,
      bvnVerified: true,
      ...(dateOfBirth ?? details.dateOfBirth ? { dateOfBirth: dateOfBirth ?? details.dateOfBirth } : {}),
      ...(details.firstName || details.lastName
        ? { name: [details.firstName, details.lastName].filter(Boolean).join(" ") }
        : {})
    }).where(eq(users.id, userId)).returning();

    if (!updated) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    await db.update(bvnVerificationSessions).set({
      completedAt: new Date()
    }).where(eq(bvnVerificationSessions.id, session.id));

    await auditService.record({
      actorUserId: userId,
      action: "kyc.bvn.verified",
      resourceType: "user",
      resourceId: updated.id,
      status: "success"
    });

    // Auto-provision the Squad virtual account now that identity is confirmed.
    // Non-blocking — a Squad API failure must not roll back a successful BVN verification.
    userService.provisionVirtualAccount(userId).catch((err: unknown) => {
      logger.warn({ err, userId }, "Auto virtual account provisioning failed after BVN verification");
    });

    return updated;
  },

  async refreshToken(refreshToken: string, metadata?: { ipAddress?: string | null; userAgent?: string | null }) {
    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(refreshToken, "refresh");
    } catch {
      throw new AppError(401, "Invalid refresh token", "REFRESH_TOKEN_INVALID");
    }

    if (!payload.sid) {
      throw new AppError(401, "Refresh token is missing session metadata", "REFRESH_TOKEN_INVALID");
    }

    const [user, session] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, payload.sub) }),
      db.query.refreshSessions.findFirst({
        where: and(
          eq(refreshSessions.id, payload.sid),
          eq(refreshSessions.userId, payload.sub),
          isNull(refreshSessions.revokedAt)
        )
      })
    ]);

    if (!user || !session || user.tokenVersion !== payload.ver || session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "Refresh session is invalid", "REFRESH_SESSION_INVALID");
    }

    await db.update(refreshSessions).set({
      lastUsedAt: new Date(),
      userAgent: metadata?.userAgent ?? session.userAgent,
      ipAddress: metadata?.ipAddress ?? session.ipAddress
    }).where(eq(refreshSessions.id, session.id));

    return {
      accessToken: issueAccessToken(user.id, user.tokenVersion),
      refreshToken: issueRefreshToken(user.id, user.tokenVersion, session.id)
    };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = verifyToken(refreshToken, "refresh");
      await Promise.all([
        // Revoke the refresh session
        payload.sid
          ? db.update(refreshSessions).set({ revokedAt: new Date() }).where(eq(refreshSessions.id, payload.sid))
          : Promise.resolve(),
        // Bump tokenVersion so all existing access tokens for this user fail immediately
        db.update(users)
          .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
          .where(eq(users.id, payload.sub))
      ]);
    } catch {
      // Invalid/expired refresh token — still succeed, nothing to revoke
    }

    return { success: true };
  }
};
