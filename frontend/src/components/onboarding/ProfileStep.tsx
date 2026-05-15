import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/lib/onboarding/steps";

const OCCUPATION_OPTIONS = [
  { value: "employed",      label: "Employed (salary / wages)" },
  { value: "self_employed", label: "Self-employed / Business owner" },
  { value: "student",       label: "Student / NYSC Corps member" },
  { value: "unemployed",    label: "Unemployed / Job-seeking" },
] as const;

export function ProfileStep() {
  const { control, watch } = useFormContext<ProofidentFormData>();
  const occupation = watch("occupation");

  const showCompanyField =
    occupation === "employed" || occupation === "self_employed";
  const companyLabel =
    occupation === "self_employed"
      ? "Business Type"
      : "Company & Role";
  const companyPlaceholder =
    occupation === "self_employed"
      ? "e.g. Fabric trading, keke driving, catering…"
      : "e.g. Jumia — Delivery Coordinator";

  return (
    <FieldGroup className="space-y-5">

      {/* Occupation */}
      <Controller
        name="occupation"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="occupation" className="text-black/90 text-sm font-medium">
              Employment Status
            </FieldLabel>
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="occupation"
                aria-invalid={fieldState.invalid}
                className="border-black focus:border-black/70 data-invalid:border-red-500 h-11!"
              >
                <SelectValue placeholder="Select your status" />
              </SelectTrigger>
              <SelectContent className=" border-black/70">
                {OCCUPATION_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="py-2"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />

      {/* Conditional: company / business type */}
      {showCompanyField && (
        <Controller
          name="companyOrBusiness"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="companyOrBusiness"
                className="text-black/90 text-sm font-medium"
              >
                {companyLabel}{" "}
                <span className="font-normal">(optional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="companyOrBusiness"
                placeholder={companyPlaceholder}
                aria-invalid={fieldState.invalid}
                className="border-black placeholder:text-black/60 focus:border-black/70 caret-black h-11 "
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
              )}
            </Field>
          )}
        />
      )}

      {/* Monthly income */}
      <Controller
        name="income"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="income" className="text-black/90 text-sm font-medium">
              Estimated Monthly Income
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none select-none">
                ₦
              </span>
              <Input
                {...field}
                id="income"
                inputMode="numeric"
                placeholder="50000"
                aria-invalid={fieldState.invalid}
                className="border-black placeholder:text-black/60 focus:border-black/70 pl-7 h-11!"
              />
            </div>
            <FieldDescription className="text-black/60 text-xs">
              An estimate is fine — include all income sources
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />

      {/* State */}
      <Controller
        name="state"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="state" className="text-black/90 text-sm font-medium">
              State of Residence
            </FieldLabel>
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="state"
                aria-invalid={fieldState.invalid}
                className="border-black focus:border-black/70 data-invalid:border-red-500 h-11!"
              >
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem
                    key={s}
                    value={s.toLowerCase()}
                    className="py-2"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />

      {/* Skills */}
      <Controller
        name="skills"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="skills" className="text-black/90 text-sm font-medium">
              Skills{" "}
              <span className="font-normal">(optional)</span>
            </FieldLabel>
            <Input
              {...field}
              id="skills"
              placeholder="e.g. Graphic design, driving, coding, tailoring…"
              aria-invalid={fieldState.invalid}
              className="border-black placeholder:text-black/60 focus:border-black/70 h-11"
            />
            <FieldDescription className="text-zinc-600 text-xs">
              Helps us match you to jobs that fit what you can already do
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} className="text-red-400 text-xs" />
            )}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
