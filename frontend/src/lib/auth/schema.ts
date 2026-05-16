import * as z from "zod/v3";

export type AuditType = {
  auditType: "website" | "android-apps" | "ios-apps" | "company" | "social-media";
  auditUrl: string;
};

export const PASSWORD_CRITERIA = [
  "Password must be at least 8 characters long",
  "Password must contain at least one lowercase letter",
  "Password must contain at least one uppercase letter",
  "Password must contain at least one number",
  "Password must contain at least one special character",
] as const;

const passwordSchema = z
  .string()
  .min(8, { message: PASSWORD_CRITERIA[0] })
  .regex(/[a-z]/, { message: PASSWORD_CRITERIA[1] })
  .regex(/[A-Z]/, { message: PASSWORD_CRITERIA[2] })
  .regex(/\d/, { message: PASSWORD_CRITERIA[3] })
  .regex(/[^a-zA-Z0-9\s]/, { message: PASSWORD_CRITERIA[4] });

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required" }),
});

const baseSignupFields = {
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: passwordSchema,
  confirmPassword: z.string(),
  cfToken: z.string().min(1, { message: "Please complete the challenge" }),
};

const passwordMatchRefinement = {
  message: "Confirm Password field must match password field",
  path: ["confirmPassword"],
};

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

export const signupSchema = z
  .object(baseSignupFields)
  .refine(passwordsMatch, passwordMatchRefinement);

export const auditSignupSchema = z
  .object({
    ...baseSignupFields,
    auditType: z.string().optional(),
    auditUrl: z.string().optional(),
  })
  .refine(passwordsMatch, passwordMatchRefinement);

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    token: z.string().min(1, { message: "Please use the reset link sent to your mailer" }),
  })
  .refine(passwordsMatch, passwordMatchRefinement);

interface User {
  id: string;
  email: string;
  verified: boolean;
  via: string;
}

interface Workspace {
  id: string;
  name: string;
  plan: string;
  preferred_locale: string;
  location: string | null;
}

interface Billing {
  token_balance: number;
  owner_type: string;
  owner_id: string;
}

export interface MeResponse {
  user: User;
  workspace: Workspace;
  billing: Billing;
}

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type AuditSignupFormValues = z.infer<typeof auditSignupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
