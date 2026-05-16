import { StepDef } from "@/components/multistep/types";
import { WelcomeFormData, welcomePhoneSchema, welcomeOtpSchema } from "./schema";

export const LOGIN_STEPS: StepDef<WelcomeFormData>[] = [
  {
    id: "phone",
    title: "Welcome back",
    subtitle: "Enter your phone number to continue",
    fields: ["phone"],
    schema: welcomePhoneSchema,
  },
  {
    id: "otp",
    title: "Verify it's you",
    subtitle: "Enter the 6-digit code we just sent",
    fields: ["otp"],
    schema: welcomeOtpSchema,
  },
];