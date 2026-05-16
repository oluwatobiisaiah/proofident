"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { proofidentSchema, ProofidentFormData } from "@/lib/schemas";
import { ONBOARDING_STEPS } from "@/lib/steps";
import { MultiStepFormContext } from "@/hooks/useMultiStepForm";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import { FormNavigation } from "@/components/onboarding/FormNavigation";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { PhoneStep } from "@/components/onboarding/PhoneStep";
import { OTPStep } from "@/components/onboarding/OTPStep";
import { BVNStep } from "@/components/onboarding/BVNStep";
import { BVNVerificationStep } from "@/components/onboarding/BVNVerificationStep";
import { DataSourcesStep } from "@/components/onboarding/DataSourcesStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";

// ─── Map step IDs to their components ────────────────────────────────────────
const STEP_COMPONENTS: Record<string, React.ReactNode> = {
  phone:              <PhoneStep />,
  otp:                <OTPStep />,
  bvn:                <BVNStep />,
  "bvn-verification": <BVNVerificationStep />,
  "data-sources":     <DataSourcesStep />,
  profile:            <ProfileStep />,
};

// ─── Simulated server actions per step ───────────────────────────────────────
// In production these would be real API calls.
// Return { ok: false, message: "..." } to block advancement and set a field error.
async function runStepServerAction(
  stepId: string,
  data: Partial<ProofidentFormData>
): Promise<{ ok: boolean; message?: string; field?: keyof ProofidentFormData }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));

  switch (stepId) {
    case "phone":
      // e.g. send OTP — always succeeds in demo
      console.log("[server] Sending OTP to", data.phone);
      return { ok: true };

    case "otp":
      // Simulate OTP check — reject "000000" as obviously wrong
      if (data.otp === "000000") {
        return { ok: false, field: "otp", message: "That code is invalid. Try again." };
      }
      console.log("[server] OTP verified");
      return { ok: true };

    case "bvn":
      // Simulate BVN lookup — triggers the OTP send to BVN-linked number
      console.log("[server] Verifying BVN", data.bvn);
      return { ok: true };

    case "bvn-verification":
      // Validate DOB matches BVN record + verify the OTP
      if (data.bvnOtp === "000000") {
        return { ok: false, field: "bvnOtp", message: "That code is invalid. Try again." };
      }
      console.log("[server] BVN OTP verified, DOB:", data.dateOfBirth);
      return { ok: true };

    case "data-sources":
      // No server call needed — purely client
      return { ok: true };

    case "profile":
      // Last step before submit — could pre-validate income etc.
      return { ok: true };

    default:
      return { ok: true };
  }
}

export function OnboardingForm() {
  // Welcome screen is outside the form — it has no fields to validate.
  // Once the user taps "Get Started", we flip this and reveal the stepped form.
  const [showWelcome, setShowWelcome] = useState(true);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  // ── Single useForm instance for ALL steps ─────────────────────────────────
  // Resolver uses the full combined schema — but we only trigger()
  // the current step's fields on "Continue", so other fields don't
  // show errors until their step is reached.
  const methods = useForm<ProofidentFormData>({
    resolver: zodResolver(proofidentSchema),
    defaultValues: {
      phone:            "",
      otp:              "",
      bvn:              "",
      dateOfBirth:      undefined,
      bvnOtp:           "",
      dataSources:      [],
      occupation:       undefined,
      companyOrBusiness: "",
      income:           "",
      state:            "",
      skills:           "",
    },
    mode: "onTouched", // validate on blur, then live after first touch
  });

  // ── nextStep: the core validation + server-call logic ────────────────────
  const nextStep = async () => {
    setIsLoading(true);

    try {
      // 1. trigger() only the current step's fields against the combined schema
      const isValid = await methods.trigger(currentStep.fields, {
        shouldFocus: true,
      });

      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // 2. Double-check with the step's own schema (catches edge cases
      //    where the combined schema is more lenient than the step schema)
      const stepValues = Object.fromEntries(
        currentStep.fields.map((f) => [f, methods.getValues(f)])
      );
      const stepResult = currentStep.schema.safeParse(stepValues);

      if (!stepResult.success) {
        stepResult.error.errors.forEach((err) => {
          const fieldName = err.path[0] as keyof ProofidentFormData;
          if (currentStep.fields.includes(fieldName)) {
            methods.setError(fieldName, {
              type: "manual",
              message: err.message,
            });
          }
        });
        setIsLoading(false);
        return;
      }

      // 3. Run any step-specific server action (send OTP, verify BVN, etc.)
      const serverResult = await runStepServerAction(
        currentStep.id,
        stepValues as Partial<ProofidentFormData>
      );

      if (!serverResult.ok) {
        // Server rejected — set the error on the relevant field
        if (serverResult.field) {
          methods.setError(serverResult.field, {
            type: "server",
            message: serverResult.message,
          });
        }
        setIsLoading(false);
        return;
      }

      // 4. All good — advance
      setCurrentStepIndex((i) => i + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  };

  const goToStep = (index: number) => {
    // Only allow going back to already-completed steps
    if (index >= 0 && index < currentStepIndex) {
      setCurrentStepIndex(index);
    }
  };

  // ── Final submit: full schema fires here ─────────────────────────────────
  const onSubmit = async (data: z.infer<typeof proofidentSchema>) => {
    setIsLoading(true);
    try {
      // All fields validated against the complete combined schema
      console.log("[submit] Full validated form data:", data);
      // TODO: POST to /api/onboarding/complete
      await new Promise((r) => setTimeout(r, 1200));
      alert("Onboarding complete! Redirecting to your credit score...");
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    currentStepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    isLoading,
    nextStep,
    prevStep,
    goToStep,
    steps: ONBOARDING_STEPS,
  };

  // ── Show welcome screen before the stepped form ──────────────────────────
  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }

  return (
    <MultiStepFormContext.Provider value={contextValue}>
      {/*
        FormProvider gives every child access to the form instance
        via useFormContext() — no prop drilling needed.
      */}
      <FormProvider {...methods}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">

            {/* ── Brand header ─────────────────────────────────────────── */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black tracking-tight text-white">
                proof<span className="text-amber-500">ident</span>
              </h1>
              <p className="text-zinc-600 text-xs mt-1 tracking-wide uppercase">
                Financial identity for every Nigerian
              </p>
            </div>

            {/* ── Card ─────────────────────────────────────────────────── */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">

              {/* Progress bar + steps */}
              <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60">
                <ProgressIndicator />
                <div className="mt-4">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest">
                    Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
                  </p>
                  <h2 className="text-white font-bold text-lg mt-0.5 leading-tight">
                    {currentStep.title}
                  </h2>
                  <p className="text-zinc-500 text-sm mt-0.5">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Step content + nav all inside one <form> */}
              <form
                onSubmit={methods.handleSubmit(onSubmit)}
                noValidate
                className="p-6 space-y-6"
              >
                {/* Render the current step component */}
                <div key={currentStep.id} className="animate-in fade-in slide-in-from-right-4 duration-200">
                  {STEP_COMPONENTS[currentStep.id]}
                </div>

                {/* Nav buttons — Continue (type=button) or Submit (type=submit) */}
                <FormNavigation />
              </form>
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <p className="text-center text-zinc-700 text-xs mt-6">
              Your data is encrypted and never sold.{" "}
              <span className="text-zinc-500 underline cursor-pointer hover:text-zinc-400">
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      </FormProvider>
    </MultiStepFormContext.Provider>
  );
}
