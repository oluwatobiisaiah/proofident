import { randomInt } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "../config/database.js";
import { otpVerifications, users } from "../db/schema/index.js";
import { AppError } from "../utils/app-error.js";
import { issueAccessToken, issueRefreshToken } from "../utils/tokens.js";

function generateOtp() {
  return String(randomInt(100000, 999999));
}

export const authService = {
  async sendOtp(phone: string) {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.insert(otpVerifications).values({
      phone,
      otpCode: otp,
      expiresAt
    });

    return {
      phone,
      otp,
      expiresAt
    };
  },

  async verifyOtp(phone: string, otp: string) {
    const record = await db.query.otpVerifications.findFirst({
      where: eq(otpVerifications.phone, phone),
      orderBy: [desc(otpVerifications.createdAt)]
    });

    if (!record) {
      throw new AppError(400, "OTP not found", "OTP_NOT_FOUND");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError(400, "OTP expired", "OTP_EXPIRED");
    }

    if (record.otpCode !== otp) {
      throw new AppError(400, "Invalid OTP", "OTP_INVALID");
    }

    await db
      .update(otpVerifications)
      .set({ verified: true, attempts: record.attempts + 1 })
      .where(eq(otpVerifications.id, record.id));

    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (existingUser) {
      return {
        user: existingUser,
        accessToken: issueAccessToken(existingUser.id),
        refreshToken: issueRefreshToken(existingUser.id)
      };
    }

    const [newUser] = await db
      .insert(users)
      .values({
        phone,
        phoneVerified: true
      })
      .returning();

    if (!newUser) {
      throw new AppError(500, "Failed to create user", "USER_CREATE_FAILED");
    }

    return {
      user: newUser,
      accessToken: issueAccessToken(newUser.id),
      refreshToken: issueRefreshToken(newUser.id)
    };
  },

  async verifyBvn(userId: string, bvn: string, dateOfBirth?: string) {
    const [updated] = await db.update(users).set({
      bvn,
      bvnVerified: true,
      ...(dateOfBirth ? { dateOfBirth } : {})
    }).where(eq(users.id, userId)).returning();

    if (!updated) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    return updated;
  },

  async refreshToken(userId: string) {
    return {
      accessToken: issueAccessToken(userId),
      refreshToken: issueRefreshToken(userId)
    };
  },

  async logout() {
    return { success: true };
  }
};
