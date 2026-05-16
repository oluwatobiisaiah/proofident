import { OnboardingStep } from "@/components/onboarding/types";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
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
    schema: welcomeSchema,
  },
  {
    id: "bvn",
    title: "Identity verification",
    subtitle: "Your BVN is required by CBN for loan eligibility",
    fields: ["bvn"],
    schema: step1Schema,
  },
  {
    id: "bvn-verification",
    title: "Confirm your identity",
    subtitle:
      "Enter your date of birth and the code sent to your BVN-linked number",
    fields: ["dateOfBirth", "bvnOtp"],
    schema: step2Schema,
  },
  {
    id: "data-sources",
    title: "Connect your accounts (Optional)",
    subtitle: "More data means a higher confidence score — all optional",
    fields: ["dataSources"],
    schema: welcomeSchema,
  },
  {
    id: "profile",
    title: "Tell us about yourself",
    subtitle: "Helps us find the right job matches for you",
    fields: ["occupation", "companyOrBusiness", "income", "state", "skills"],
    schema: step4Schema,
  },
];

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];
 

export const DATA_SOURCES = [
  {
    category: "betting platforms",
    institutions: [
      {
        id: "sportybet",
        label: "SportyBet",
        description: "Betting history",
        stars: 5,
        image: "/sporty_logo.png",
        badge: "Best signal",
      },
      {
        id: "bet9ja",
        label: "Bet9ja",
        description: "Betting history",
        stars: 5,
        image: "/bet9ja_logo.png",
        badge: "Best signal",
      },
    ],
  },
  {
    category: "financial institutions",
    institutions: [
      {
        id: "opay",
        label: "Opay",
        description: "Mobile money",
        stars: 4,
        image: "/opay_logo.webp",
        badge: null,
      },
      {
        id: "gtbank",
        label: "GTBank",
        description: "Mobile money",
        stars: 5,
        image: "/gtbank_logo.jpeg",
        badge: null,
      },
    ],
  },
];

export const SUPPORTED_BANKS: {
  [key: string]: string;
} = {
  opay: "6467aad147ccd75fc766fd43",
  gtbank: "5f2d08be60b92e2888287702",
};
