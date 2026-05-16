"use client";

import { useState, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { InitiateBVNRequestSuccess } from "@/lib/onboarding/api";

export function BVNVerificationStep() {
  const { control, watch } = useFormContext<ProofidentFormData>();

  const { stepData } = useMultiStepForm<ProofidentFormData>();
  const bvnStepRes = stepData["bvn"] as InitiateBVNRequestSuccess | undefined;

  const bvnExpire =
    bvnStepRes?.expiresAt && bvnStepRes?.expiresAt !== "expired" && new Date(bvnStepRes?.expiresAt).getTime();
  
  const rawSecOTPExpire = bvnExpire ? (bvnExpire - Date.now())/1000: 0;
  const secOTPExpire = Math.floor(rawSecOTPExpire);

  const [resendTimer, setResendTimer] = useState(secOTPExpire);
  const [canResend, setCanResend] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Show the timezone-safe selected date in the description
  const selectedDate = watch("dateOfBirth");

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      (stepData["bvn"] as InitiateBVNRequestSuccess).expiresAt = "expired"
      return;
    }
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleResend = () => {
    // In production: trigger BVN OTP resend API call here
    setResendTimer(30);
    setCanResend(false);
  };

  return (
    <FieldGroup className='space-y-6'>
      {/* Date of Birth */}
      <Controller
        name='dateOfBirth'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className='text-black/90 text-sm font-medium'>
              Date of Birth
            </FieldLabel>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  id='dateOfBirth'
                  aria-invalid={fieldState.invalid}
                  className='w-full justify-between font-normal data-invalid:border-red-500 h-11'
                >
                  {field.value
                    ? format(field.value, "dd MMMM yyyy")
                    : "Select date"}
                  <ChevronDown className='w-4 h-4 text-zinc-500' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className='w-auto overflow-hidden p-0 bg-white'
                align='start'
              >
                <Calendar
                  mode='single'
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    setCalendarOpen(false);
                  }}
                  captionLayout='dropdown'
                  startMonth={new Date(1940, 0)}
                  endMonth={new Date(new Date().getFullYear() - 18, 11)}
                  disabled={{ after: new Date() }}
                  className='bg-white text-zinc-900 [--rdp-accent-color:theme(colors.amber.500)]'
                />
              </PopoverContent>
            </Popover>

            <FieldDescription className='text-zinc-600 text-xs'>
              Must match the date registered with your BVN
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError
                errors={[fieldState.error]}
                className='text-red-400 text-xs'
              />
            )}
          </Field>
        )}
      />

      {/* BVN OTP */}
      {/*
        Mirrors OTPStep exactly:
        - Same Field / FieldLabel / FieldError structure
        - Same mono centered input with tracking
        - Same resend timer pattern
      */}
      <Controller
        name='bvnOtp'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor='bvnOtp'
              className='text-black/90 text-sm font-medium'
            >
              BVN Verification Code
            </FieldLabel>

            <div className='p-3 rounded-lg bg-black/10 border border-black/30 mb-1'>
              <p className='text-black/80 text-xs leading-relaxed'>
                A 6-digit code was sent to the phone number linked to your BVN —
                this may differ from the number you entered earlier.
              </p>
            </div>

            <Input
              {...field}
              id='bvnOtp'
              inputMode='numeric'
              maxLength={6}
              placeholder='000 000'
              aria-invalid={fieldState.invalid}
              className='text-center text-2xl font-mono h-11'
            />

            {fieldState.invalid && (
              <FieldError
                errors={[fieldState.error]}
                className='text-red-400 text-xs'
              />
            )}
          </Field>
        )}
      />

      {/* Resend row — matches OTPStep pattern */}
      <div className='flex items-center justify-between text-sm -mt-2'>
        <span className='text-zinc-600'>Didn't get it?</span>
        {canResend ? (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleResend}
            className='text-black hover:underline p-0 h-auto'
          >
            Resend code
          </Button>
        ) : (
          <span className='text-zinc-500 font-mono'>
            Resend in <span className='text-amber-500'>{resendTimer}s</span>
          </span>
        )}
      </div>
    </FieldGroup>
  );
}
