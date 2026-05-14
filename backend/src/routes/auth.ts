import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { smsService } from "../services/sms.service.js";

const sendOtpSchema = z.object({
  phone: z.string().regex(/^0[7-9][0-1]\d{8}$/)
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^0[7-9][0-1]\d{8}$/),
  otp: z.string().length(6)
});

const verifyBvnSchema = z.object({
  sessionId: z.uuid(),
  otp: z.string().length(6),
  method: z.string().optional(),
  dateOfBirth: z.string().optional()
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/bvn/initiate", { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      bvn: z.string().length(11)
    }).parse(request.body);
    const result = await authService.initiateBvnVerification(request.auth!.userId, body.bvn);
    return reply.send({ success: true, ...result });
  });

  app.post("/auth/send-otp", async (request, reply) => {
    const body = sendOtpSchema.parse(request.body);
    const result = await authService.sendOtp(body.phone, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    });
    await smsService.sendOtp(body.phone, result.otp);

    return reply.send({
      success: true,
      message: "OTP sent successfully",
      expiresAt: result.expiresAt,
      ...(env.ALLOW_DEV_OTP_EXPOSURE && env.NODE_ENV !== "production" ? { devOtp: result.otp } : {})
    });
  });

  app.post("/auth/verify-otp", async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);
    const session = await authService.verifyOtp(body.phone, body.otp, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    });

    return reply.send({
      success: true,
      ...session
    });
  });

  app.post("/auth/verify-bvn", { preHandler: requireAuth }, async (request, reply) => {
    const body = verifyBvnSchema.parse(request.body);
    const user = await authService.verifyBvn(request.auth!.userId, body.sessionId, body.otp, body.dateOfBirth, body.method);
    return reply.send({ success: true, user });
  });

  app.post("/auth/refresh-token", async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokens = await authService.refreshToken(body.refreshToken, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    });
    return reply.send({ success: true, ...tokens });
  });

  app.post("/auth/logout", async (request, reply) => {
    const body = z.object({
      refreshToken: z.string().min(20).optional()
    }).parse(request.body ?? {});
    const result = await authService.logout(body.refreshToken);
    return reply.send(result);
  });
};
