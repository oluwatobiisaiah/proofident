"use client";

import { Controller, useFormContext } from "react-hook-form";
import { WelcomeFormData } from "@/lib/welcome/schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formatNigerianPhone = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, "");
  const prefix =
    cleaned.startsWith("+234") ? "+234" :
    cleaned.startsWith("234")  ? "234"  : "";

  let digits =
    cleaned.startsWith("+234") ? cleaned.slice(4) :
    cleaned.startsWith("234")  ? cleaned.slice(3) :
    cleaned;

  digits = digits.replace(/\D/g, "").slice(0, prefix ? 10 : 11);

  const [a, b, c] = [
    digits.slice(0, prefix ? 3 : 4),
    digits.slice(prefix ? 3 : 4, prefix ? 6 : 7),
    digits.slice(prefix ? 6 : 7),
  ];

  const local = [a, b, c].filter(Boolean).join(" ");
  return prefix ? `${prefix} ${local}`.trim() : local;
};

export function WelcomePhoneStep() {
  const { control } = useFormContext<WelcomeFormData>();

  return (
    <div className="space-y-8 font-inter">
      <div className="">
        <h1 className="font-ptserif font-bold text-3xl sm:text-4xl">Welcome</h1>
        <p className="leading-tight">Please enter your phone number to use the application</p>
      </div>
    

      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor="login-phone"
              className="text-[11px] uppercase tracking-widest text-black/40 font-medium"
            >
              Phone Number
            </FieldLabel>
            <Input
              {...field}
              id="login-phone"
              type="tel"
              placeholder="0801 234 5678"
              autoComplete="tel"
              aria-invalid={fieldState.invalid}
              onChange={(e) => field.onChange(formatNigerianPhone(e.target.value))}
              className="h-12 text-base border-black/20 bg-transparent focus:border-black focus:ring-0 rounded-xl placeholder:text-black/20 font-mono tracking-wider"
            />
            {fieldState.invalid && (
              <FieldError
                errors={[fieldState.error]}
                className="text-red-500 text-xs"
              />
            )}
          </Field>
        )}
      />
    </div>
  );
}