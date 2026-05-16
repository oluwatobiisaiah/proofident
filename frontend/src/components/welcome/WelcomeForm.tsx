"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { welcomeSchema, WelcomeFormData } from "@/lib/welcome/schema";
import { LOGIN_STEPS } from "@/lib/welcome/welcomeSteps";
import { MultiStepForm } from "@/components/multistep/MultiStepForm";
import { WelcomePhoneStep } from "@/components/welcome/WelcomePhoneStep";
import { WelcomeOtpStep } from "@/components/welcome/WelcomeOtpStep";
import { toastError } from "@/lib/toastUtils";
import { sendOTP } from "@/lib/welcome/api";
import { useRef } from "react";
import { signIn } from "next-auth/react";

const STEP_COMPONENTS: Record<string, React.ReactNode> = {
  phone: <WelcomePhoneStep />,
  otp: <WelcomeOtpStep />,
};

export function WelcomeForm() {
  const form = useForm<WelcomeFormData, any, WelcomeFormData>({
    resolver: zodResolver(welcomeSchema),
    defaultValues: { phone: "", otp: "" },
    mode: "onTouched",
  });

  const stepData = useRef<Record<string, unknown>>({});

  async function handleStepSubmit(
    stepId: string,
    data: Partial<WelcomeFormData>,
  ) {
    await new Promise((r) => setTimeout(r, 600));
    if (stepId === "phone") {
      if (!data.phone)
        return {
          ok: false,
          field: "phone",
          message: "Phone number is required.",
        };
      try {
        const response = await sendOTP({ phone: data.phone });
        
        // Store data
        stepData.current[stepId] = response;
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toastError(message);
        return { ok: false, message: message };
      }
    }
    if (stepId === "otp") {
      if (data.otp === "000000")
        return { ok: false, field: "otp", message: "Invalid code. Try again." };
      console.log("[auth] OTP verified");
      return { ok: true };
    }
    return { ok: true };
  }

  async function handleComplete(data: WelcomeFormData) {
    console.log("[auth] Login complete", data);
    const res = await signIn("credentials", {
      phone: data.phone,
      otp: data.otp,
      redirect: false,
    });
    // TODO: POST /api/auth/login
  }

  return (
    <MultiStepForm<WelcomeFormData>
      form={form}
      steps={LOGIN_STEPS}
      stepComponents={STEP_COMPONENTS}
      onStepSubmit={handleStepSubmit}
      onComplete={handleComplete}
      stepData={stepData.current}
      footerText={<></>}
      finalButtonLabel={{
        label: "Login",
        submissionLabel: "Login",
      }}
    />
  );
}
