import { useState, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function OTPStep() {
  const { control, watch } = useFormContext<ProofidentFormData>();
  const phone = watch("phone");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = () => {
    // In production: trigger OTP resend API call here
    setCountdown(30);
    setCanResend(false);
  };

  // Mask the phone: 0812****678
  const maskedPhone = phone
    ? phone.replace(/(\d{4})\d{4}(\d{3,4})$/, "$1****$2")
    : "your number";

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <p className="text-zinc-400 text-sm">
          Code sent to{" "}
          <span className="text-white font-mono font-medium">{maskedPhone}</span>
        </p>
        <p className="text-white/80 text-xs mt-1">
          Check your SMS inbox — it may take up to 60 seconds
        </p>
      </div>

      <Controller
        name="otp"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="otp" className="text-black/90 text-sm font-medium">
              Verification Code
            </FieldLabel>
            <Input
              {...field}
              id="otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="000 000"
              aria-invalid={fieldState.invalid}
              className="border-black caret-black text-center text-2xl font-mono tracking-[0.6em] placeholder:text-black/60 focus:border-black/70 focus:ring-black/20 h-11"
            />
            <FieldDescription className="text-zinc-600 text-xs">
              Enter the 6-digit code from your SMS
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="">Didn't get it?</span>
        {canResend ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            className="hover:font-medium p-0 h-auto"
          >
            Resend code
          </Button>
        ) : (
          <span className="text-zinc-500 font-mono">
            Resend in{" "}
            <span className="text-amber-500">{countdown}s</span>
          </span>
        )}
      </div>
    </div>
  );
}
