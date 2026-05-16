"use client";

import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { proofidentSchema, ProofidentFormData } from "@/lib/onboarding/schemas";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";
import { MultiStepForm } from "@/components/multistep/MultiStepForm";

import { WelcomeScreen } from "./WelcomeScreen";
import { BVNStep } from "./BVNStep";
import { DataSourcesStep } from "./DataSourcesStep";
import { ProfileStep } from "./ProfileStep";
import { BVNVerificationStep } from "./BVNVerificationStep";
import {
  InitiateBVNRequest,
  InitiateBVNRequestSuccess,
  verifyBVN,
} from "@/lib/onboarding/api";
import { useSession } from "next-auth/react";
import { toastError } from "@/lib/toastUtils";
import { useRef } from "react";

const STEP_COMPONENTS: Record<string, React.ReactNode> = {
  welcome: <WelcomeScreen />,
  bvn: <BVNStep />,
  "bvn-verification": <BVNVerificationStep />,
  "data-sources": <DataSourcesStep />,
  profile: <ProfileStep />,
};

export function OnboardingForm() {
  const { data: session } = useSession();
  // Consumer owns useForm — no type fights in MultiStepForm
  const form = useForm<ProofidentFormData>({
    resolver: zodResolver(proofidentSchema),
    defaultValues: {
      bvn: "",
      dateOfBirth: undefined,
      bvnOtp: "",
      dataSources: [],
      occupation: "employed",
      companyOrBusiness: "",
      income: "",
      state: "",
      skills: "",
    },
    mode: "onChange",
  });

  const stepData = useRef<Record<string, unknown>>({});

  async function handleStepSubmit(
    stepId: string,
    data: Partial<ProofidentFormData>,
  ) {
    if (!session?.accessToken) {
      // toastError("User is not authenticated");
      // return {
      //   ok: false,
      //   message: "User has to be authenticated",
      // };
    }
    await new Promise((r) => setTimeout(r, 600));

    switch (stepId) {
      case "bvn":
        if (!data.bvn)
          return {
            ok: false,
            field: "bvn",
            message: "BVN is required",
          };

        try {
          const response = await InitiateBVNRequest(
            {
              bvn: data.bvn,
            },
            session?.accessToken,
          );

          // Store data
          stepData.current[stepId] = response;
          return { ok: true };
        } catch (err) {}
        return { ok: true };
      case "bvn-verification":
        const bvn = form.getValues("bvn");
        if (!data.bvnOtp || !bvn || !data.dateOfBirth)
          return {
            ok: false,
            field: "bvnOtp",
            message: "OTP is required",
          };

        try {
          const response = await verifyBVN(
            {
              bvn,
              bvnOtp: data.bvnOtp,
              dateOfBirth: data.dateOfBirth,
            },
            session?.accessToken,
            (stepData.current["bvn"] as InitiateBVNRequestSuccess).sessionId,
          );

          // Store data
          stepData.current[stepId] = response;
          return { ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toastError(message);
          if (message == "BVN date of birth does not match the supplied record")
            return { ok: false, message: message, field: "bvn" };
          else return { ok: false, message: message };
        }

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

  async function handleComplete(data: ProofidentFormData) {
    await new Promise((r) => setTimeout(r, 1200));
    console.log("[submit] Full validated form data:", data);
    alert("Onboarding complete!");
  }

  return (
    <MultiStepForm<ProofidentFormData>
      form={form}
      steps={ONBOARDING_STEPS}
      stepComponents={STEP_COMPONENTS}
      onStepSubmit={handleStepSubmit}
      onComplete={handleComplete}
      stepData={stepData.current}
      footerText={
        <>
          Your data is encrypted and never sold.{" "}
          <span className='underline cursor-pointer hover:text-black/90'>
            Privacy Policy
          </span>
        </>
      }
    />
  );
}
