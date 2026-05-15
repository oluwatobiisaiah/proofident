import { OnboardingStep } from "@/components/onboarding/types";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  welcomeSchema,
} from "@/lib/onboarding/schemas";

// This array drives everything — add/remove steps here only.
// `fields` tells trigger() exactly which RHF fields to validate per step.
// `schema` is used in nextStep's safeParse for manual error reporting.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Get a credit score + job matches in 5 minutes",
    subtitle: "No paperwork. Just connect your accounts.",
    fields: [],
    schema: welcomeSchema
  },
  {
    id: "phone",
    title: "Enter your phone number",
    subtitle: "We'll send a one-time verification code",
    fields: ["phone"],
    schema: step1Schema,
  },
  {
    id: "otp",
    title: "Verify your number",
    subtitle: "Enter the 6-digit code we just sent you",
    fields: ["otp"],
    schema: step2Schema,
  },
  {
    id: "bvn",
    title: "Identity verification",
    subtitle: "Your BVN is required by CBN for loan eligibility",
    fields: ["bvn"],
    schema: step3Schema,
  },
  {
    id: "data-sources",
    title: "Connect your accounts",
    subtitle: "More data means a higher confidence score — all optional",
    fields: ["dataSources"],
    schema: step4Schema,
  },
  {
    id: "profile",
    title: "Tell us about yourself",
    subtitle: "Helps us find the right job matches for you",
    fields: ["occupation", "companyOrBusiness", "income", "state", "skills"],
    schema: step5Schema,
  },
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti",
  "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const DATA_SOURCES = [
  { id: "sportybet", label: "SportyBet", description: "Betting history", stars: 5, emoji: "⚽", badge: "Best signal" },
  { id: "bet9ja",    label: "Bet9ja",    description: "Betting history", stars: 5, emoji: "🎯", badge: "Best signal" },
  { id: "opay",      label: "Opay",      description: "Mobile money",   stars: 4, emoji: "💚", badge: null },
  { id: "moniepoint",label: "Moniepoint",description: "Mobile money",   stars: 4, emoji: "🔵", badge: null },
  { id: "contacts",  label: "Contacts",  description: "Social network", stars: 3, emoji: "👥", badge: null },
];
