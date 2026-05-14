import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { DATA_SOURCES } from "@/lib/onboarding/steps";

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-amber-500 text-xs tracking-tighter">
      {"★".repeat(count)}
      <span className="text-zinc-700">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export function DataSourcesStep() {
  const { control } = useFormContext<ProofidentFormData>();

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-zinc-500 text-xs leading-relaxed">
          You can skip all of these and use self-declared info only — but
          connecting at least one source increases your score confidence
          significantly.
        </p>
      </div>

      <Controller
        name="dataSources"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className="text-zinc-300 text-sm font-medium sr-only">
              Data Sources
            </FieldLabel>

            <div className="space-y-2" role="group" aria-label="Select data sources">
              {DATA_SOURCES.map((source) => {
                const isSelected = field.value?.includes(source.id) ?? false;

                const toggle = () => {
                  const current: string[] = field.value ?? [];
                  const next = isSelected
                    ? current.filter((v) => v !== source.id)
                    : [...current, source.id];
                  field.onChange(next);
                };

                return (
                  <button
                    key={source.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={toggle}
                    className={[
                      "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                      isSelected
                        ? "bg-amber-500/8 border-amber-500/40"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700",
                    ].join(" ")}
                  >
                    {/* Icon */}
                    <span className="text-xl w-8 text-center flex-shrink-0">
                      {source.emoji}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">
                          {source.label}
                        </span>
                        {source.badge && (
                          <span className="text-[9px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                            {source.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-zinc-600 text-xs">
                          {source.description}
                        </span>
                        <StarRating count={source.stars} />
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      aria-hidden="true"
                      className={[
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150",
                        isSelected
                          ? "bg-amber-500 border-amber-500"
                          : "border-zinc-700",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="black"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <FieldDescription className="text-zinc-600 text-xs">
              {field.value?.length
                ? `${field.value.length} source${field.value.length > 1 ? "s" : ""} selected`
                : "None selected — score will use self-declared info only"}
            </FieldDescription>

            {fieldState.invalid && (
              <FieldError
                errors={[fieldState.error]}
                className="text-red-400 text-xs"
              />
            )}
          </Field>
        )}
      />
    </div>
  );
}
