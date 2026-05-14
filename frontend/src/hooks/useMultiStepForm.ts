import { createContext, useContext } from "react";
import { MultiStepFormContextValue } from "@/components/onboarding/types";

export const MultiStepFormContext =
  createContext<MultiStepFormContextValue | null>(null);

// Throws if used outside <OnboardingForm> — fail loudly rather than silently
export function useMultiStepForm(): MultiStepFormContextValue {
  const ctx = useContext(MultiStepFormContext);
  if (!ctx) {
    throw new Error(
      "useMultiStepForm must be used inside <OnboardingForm>"
    );
  }
  return ctx;
}
