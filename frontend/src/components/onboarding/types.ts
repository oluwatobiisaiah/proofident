import { ZodType } from "zod";
import { ProofidentFormData } from "@/lib/onboarding/schemas";

// Keys of the combined form type — used to tell trigger() which fields to validate
export type FieldKey = keyof ProofidentFormData;

export type OnboardingStep = {
  id: string;
  title: string;
  subtitle: string;
  fields: FieldKey[];
  schema: ZodType<unknown>;
};

export type MultiStepFormContextValue = {
  currentStepIndex: number;
  currentStep: OnboardingStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading: boolean;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  goToStep: (index: number) => void;
  steps: OnboardingStep[];
};
