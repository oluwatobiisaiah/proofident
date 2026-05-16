"use client";

import { useState, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { WelcomeFormData } from "@/lib/welcome/schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { OTPStepData } from "@/lib/welcome/api";

export function WelcomeOtpStep() {
  const { control, watch, setValue } = useFormContext<WelcomeFormData>();
  const { stepData } = useMultiStepForm<WelcomeFormData>();
  const phoneStepRes = stepData["phone"] as OTPStepData | undefined;
  const phone = watch("phone");

  const OTPExpire =
    phoneStepRes?.expiresAt && phoneStepRes?.expiresAt !== "expired" && new Date(phoneStepRes?.expiresAt).getTime();

  const rawSecOTPExpire = OTPExpire ? (OTPExpire - Date.now())/1000: 0;
  const secOTPExpire = Math.floor(rawSecOTPExpire);
  const [countdown, setCountdown] = useState(secOTPExpire);
  const [canResend, setCanResend] = useState(false);

  const maskedPhone = phone
    ? phone.replace(/(\d{4})\d{4}(\d{3,4})$/, "$1 **** $2")
    : "your number";

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      (stepData["phone"] as OTPStepData).expiresAt = "expired"
      return;
    }
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = () => {
    setValue("otp", "");
    setCountdown(30);
    setCanResend(false);
  };

  return (
    <Controller
      name='otp'
      control={control}
      render={({ field, fieldState }) => (
        <div className='space-y-6 font-inter'>
          {/* Phone confirmation banner */}
          <div className='px-4 py-3 rounded-xl bg-black/10 border border-black/80'>
            <p className='text-xs text-black/60 uppercase tracking-widest mb-0.5'>
              Code sent to
            </p>
            <p className='font-mono font-semibold text-black tracking-wider text-sm'>
              {maskedPhone}
            </p>
          </div>

          {/* OTP input */}
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className='text-[11px] uppercase tracking-widest text-black/40 font-medium'>
              Verification Code
            </FieldLabel>

            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            >
              <InputOTPGroup className='w-full gap-2 flex'>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    aria-invalid={fieldState.invalid}
                    className={cn(
                      // Reset Shadcn's connected-pill defaults
                      "flex-1 size-auto aspect-square",
                      "rounded-xl border text-xl font-mono font-semibold",
                      // Override the first/last connected border radius from Shadcn
                      "first:rounded-xl first:border last:rounded-xl last:border",
                      "transition-all duration-150",
                      "data-[active=true]:border-black data-[active=true]:ring-0",
                      fieldState.invalid
                        ? "border-red-400 bg-red-50"
                        : "border-black/15 bg-black/2",
                    )}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {fieldState.invalid && (
              <FieldError
                errors={[fieldState.error]}
                className='text-red-500 text-xs'
              />
            )}
          </Field>

          {/* Resend row */}
          <div className='flex items-center justify-between'>
            <span className='text-xs text-black/40'>Didn't receive it?</span>
            {canResend ? (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleResend}
                className='text-xs h-auto p-0 font-semibold text-black underline-offset-2 hover:underline'
              >
                Resend code
              </Button>
            ) : (
              <span className='text-xs font-mono text-black/40'>
                Resend in{" "}
                <span className='text-black font-semibold'>{countdown}s</span>
              </span>
            )}
          </div>
        </div>
      )}
    />
  );
}
