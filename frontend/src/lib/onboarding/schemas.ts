import { z } from "zod";

// ─── Per-step schemas ────────────────────────────────────────────────────────
// Each is the source of truth for that step's validation.
// They are ALSO used to build the combined schema so the single
// useForm instance knows about every field.
export const welcomeSchema = z.object({});

export const bvnSchema = z.object({
  bvn: z
    .string()
    .length(11, "BVN must be exactly 11 digits")
    .regex(/^\d+$/, "BVN must contain digits only"),
});

// Step shown immediately after BVN entry:
// • dateOfBirth — collected via Calendar, stored as a Date object
// • bvnOtp      — the 6-digit OTP the BVN verification sends to the user's phone
export const bvnVerificationSchema = z.object({
  dateOfBirth: z
  .date({
    error: () => "Select your date of birth",
  })
  .refine(
    (d) => {
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const monthDiff = today.getMonth() - d.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
        age--;
      }
      return age >= 18;
    },
    { message: "You must be at least 18 years old" }
  )
  .refine(
    (d) => d <= new Date(),
    { message: "Date of birth cannot be in the future" }
  ),

  bvnOtp: z
    .string()
    .min(6, "Enter the 6-digit code sent to your BVN-linked number")
    .regex(/^\d+$/, "OTP must contain digits only"),
});

// Data sources are all optional — the array can be empty
export const dataSourcesSchema = z.object({
  dataSources: z.array(z.string()),
});

export const profileSchema = z.object({
  // @ts-expect-error Package incompatibility error
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
export const proofidentSchema = bvnSchema
  .merge(bvnVerificationSchema)
  .merge(dataSourcesSchema)
  .merge(profileSchema);

export type ProofidentFormData = z.infer<typeof proofidentSchema>;

// ─── Step-level schemas used in nextStep's safeParse ─────────────────────────
// These are identical to the per-step schemas above — re-exported
// under cleaner names for use in the steps config.
export {
  bvnSchema as step1Schema,
  bvnVerificationSchema as step2Schema,
  dataSourcesSchema as step3Schema,
  profileSchema as step4Schema,
};
