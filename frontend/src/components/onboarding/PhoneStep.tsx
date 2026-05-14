import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function PhoneStep() {
  const { control } = useFormContext<ProofidentFormData>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-black/5 border border-black/15">
        <span className="text-2xl">🇳🇬</span>
        <p className="text-sm leading-relaxed">
          We support all Nigerian networks — MTN, Airtel, Glo, 9mobile
        </p>
      </div>

      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="phone" className="text-black/90 text-sm font-medium">
              Phone Number
            </FieldLabel>
            <div className="flex gap-2">
              {/* <div className="flex items-center px-3 rounded-lg border border-zinc-800 text-black/50 text-sm whitespace-nowrap select-none">
                +234
              </div> */}
              <Input
                {...field}
                id="phone"
                type="tel"
                placeholder="080 1234 5678"
                autoComplete="tel"
                aria-invalid={fieldState.invalid}
                className="flex-1 border-black text-black placeholder:text-black/60 focus:border-black/70 focus:ring-black/20 h-11 text-base caret-black"
              />
            </div>
             
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />
    </div>
  );
}
