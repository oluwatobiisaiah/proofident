import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
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
  userId: z.uuid(),
  bvn: z.string().length(11),
  dateOfBirth: z.string().optional()
});

const refreshSchema = z.object({
  userId: z.uuid()
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/send-otp", async (request, reply) => {
    const body = sendOtpSchema.parse(request.body);
    const result = await authService.sendOtp(body.phone);
    await smsService.sendOtp(body.phone, result.otp);

    return reply.send({
      success: true,
      message: "OTP sent successfully",
      expiresAt: result.expiresAt,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: result.otp } : {})
    });
  });

  app.post("/auth/verify-otp", async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);
    const session = await authService.verifyOtp(body.phone, body.otp);

    return reply.send({
      success: true,
      ...session
    });
  });

  app.post("/auth/verify-bvn", async (request, reply) => {
    const body = verifyBvnSchema.parse(request.body);
    const user = await authService.verifyBvn(body.userId, body.bvn, body.dateOfBirth);
    return reply.send({ success: true, user });
  });

  app.post("/auth/refresh-token", async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokens = await authService.refreshToken(body.userId);
    return reply.send({ success: true, ...tokens });
  });

  app.post("/auth/logout", async (_request, reply) => {
    const result = await authService.logout();
    return reply.send(result);
  });
};
