import { z } from "zod";

export const welcomePhoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const patterns = [
        /^\+234 [789]\d{2} \d{3} \d{4}$/,
        /^234 [789]\d{2} \d{3} \d{4}$/,
        /^0[789]\d{2} \d{3} \d{4}$/,
      ];
      return patterns.some((p) => p.test(val));
    }, "Enter a valid Nigerian phone number"),
});

export const welcomeOtpSchema = z.object({
  otp: z
    .string()
    .length(6, "Enter the 6-digit code sent to your phone")
    .regex(/^\d+$/, "OTP must be digits only"),
});

export const welcomeSchema = welcomePhoneSchema.merge(welcomeOtpSchema);

export type WelcomePhoneData = z.infer<typeof welcomePhoneSchema>
export type WelcomeFormData = z.infer<typeof welcomeSchema>;