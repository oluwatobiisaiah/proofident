import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function BVNStep() {
  const { control } = useFormContext<ProofidentFormData>();

  return (
    <div className="space-y-6">
      {/* Trust signal */}
      <div className="flex gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="space-y-1">
          <p className="text-zinc-300 text-sm font-medium">Your BVN is safe</p>
          <p className="text-white/80 text-xs leading-relaxed">
            Encrypted end-to-end with AES-256. We only use it to verify your
            identity — it is never stored in plain text or shared with third parties.
          </p>
        </div>
      </div>

      <Controller
        name="bvn"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="bvn" className="text-black/90 text-sm font-medium">
              Bank Verification Number (BVN)
            </FieldLabel>
            <Input
              {...field}
              id="bvn"
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter your 11-digit BVN"
              aria-invalid={fieldState.invalid}
              className="border-black caret-black font-mono placeholder:text-black/60 focus:border-black/70 focus:ring-black/20 tracking-wider h-11"
            />
            <FieldDescription className="text-black/75 text-xs">
              Dial <span className="text-black/85 font-mono">*565*0#</span> on
              any phone to get your BVN — it works on all networks
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />

      {/* CBN compliance notice */}
      <div className="flex gap-2 p-3 rounded-lg bg-black/5 border border-black/15">
        <span className="text-black text-xs font-bold shrink-0 mt-0.5">CBN</span>
        <p className="text-zinc-500 text-xs leading-relaxed">
          BVN verification is required by the Central Bank of Nigeria for all
          digital lending products.
        </p>
      </div>
    </div>
  );
}
