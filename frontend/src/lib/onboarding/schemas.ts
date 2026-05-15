import { z } from "zod";

// ─── Per-step schemas ────────────────────────────────────────────────────────
// Each is the source of truth for that step's validation.
// They are ALSO used to build the combined schema so the single
// useForm instance knows about every field.
export const welcomeSchema = z.object({});

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(\+?234|0)[789]\d{9}$/,
      "Enter a valid Nigerian number (e.g. 08012345678)"
    ),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Enter the 6-digit code sent to your phone")
    .regex(/^\d+$/, "OTP must contain digits only"),
});

export const bvnSchema = z.object({
  bvn: z
    .string()
    .length(11, "BVN must be exactly 11 digits")
    .regex(/^\d+$/, "BVN must contain digits only"),
});

// Data sources are all optional — the array can be empty
export const dataSourcesSchema = z.object({
  dataSources: z.array(z.string()).default([]),
});

export const profileSchema = z.object({
  occupation: z.enum(["employed", "self_employed", "student", "unemployed"], {
    required_error: "Select your employment status",
  }),
  companyOrBusiness: z.string().optional(),
  income: z
    .string()
    .min(1, "Provide an income estimate")
    .regex(/^\d+$/, "Numbers only — no commas or symbols"),
  state: z.string().min(1, "Select your state of residence"),
  skills: z.string().optional(),
});

// ─── Combined schema ─────────────────────────────────────────────────────────
// Merged into one so a single useForm instance covers all fields.
// On intermediate steps, only the current step's fields are trigger()'d.
// On final submit, the full schema fires — catching anything that slipped through.
export const proofidentSchema = phoneSchema
  .merge(otpSchema)
  .merge(bvnSchema)
  .merge(dataSourcesSchema)
  .merge(profileSchema);

export type ProofidentFormData = z.infer<typeof proofidentSchema>;

// ─── Step-level schemas used in nextStep's safeParse ─────────────────────────
// These are identical to the per-step schemas above — re-exported
// under cleaner names for use in the steps config.
export {
  phoneSchema as step1Schema,
  otpSchema as step2Schema,
  bvnSchema as step3Schema,
  dataSourcesSchema as step4Schema,
  profileSchema as step5Schema,
};
