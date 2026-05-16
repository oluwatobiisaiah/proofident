"use client";

import { useState, ReactNode } from "react";
import {
  FormProvider,
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";

import { StepDef, MultiStepFormContextValue } from "./types";
import { MultiStepFormContext } from "@/hooks/useMultiStepForm";
import { FormNavigation } from "@/components/onboarding/FormNavigation";

type ServerActionResult = {
  ok: boolean;
  message?: string;
  field?: string;
};

type MultiStepFormProps<TFormData extends FieldValues> = {
  /** Fully configured useForm instance — consumer owns schema + defaultValues */
  form: UseFormReturn<TFormData>;
  steps: StepDef<TFormData>[];
  stepComponents: Record<string, ReactNode>;
  onStepSubmit?: (
    stepId: string,
    data: Partial<TFormData>,
  ) => Promise<ServerActionResult>;
  onComplete: (data: TFormData) => Promise<void>;
  footerText?: ReactNode;
  finalButtonLabel?: {
    submissionLabel: string;
    label: string;
  };
  stepData?: Record<string, unknown>;
};

export function MultiStepForm<TFormData extends FieldValues>({
  form,
  steps,
  stepComponents,
  onStepSubmit,
  onComplete,
  footerText,
  finalButtonLabel,
  stepData
}: MultiStepFormProps<TFormData>) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const nextStep = async () => {
    setIsLoading(true);
    try {
      const isValid = await form.trigger(
        currentStep.fields as Path<TFormData>[],
        { shouldFocus: true },
      );
      if (!isValid) return;

      const stepValues = Object.fromEntries(
        currentStep.fields.map((f) => [f, form.getValues(f)]),
      );

      const stepResult = currentStep.schema.safeParse(stepValues);
      if (!stepResult.success) {
        stepResult.error.issues.forEach((issue) => {
          const fieldName = issue.path[0] as Path<TFormData>;
          if (currentStep.fields.includes(fieldName)) {
            form.setError(fieldName, {
              type: "manual",
              message: issue.message,
            });
          }
        });
        return;
      }

      if (onStepSubmit) {
        const result = await onStepSubmit(
          currentStep.id,
          stepValues as Partial<TFormData>,
        );
        if (!result.ok) {
          if (result.field) {
            form.setError(result.field as Path<TFormData>, {
              type: "server",
              message: result.message,
            });
          }
          return;
        }
      }

      setCurrentStepIndex((i) => i + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => setCurrentStepIndex((i) => Math.max(0, i - 1));

  const goToStep = (index: number) => {
    if (index >= 0 && index < currentStepIndex) setCurrentStepIndex(index);
  };

  const onSubmit = async (data: TFormData) => {
    setIsLoading(true);
    try {
      await onComplete(data);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: MultiStepFormContextValue<TFormData> = {
    currentStepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    isLoading,
    nextStep,
    prevStep,
    goToStep,
    steps,
    stepData: stepData ?? {},
  };

  return (
    <MultiStepFormContext.Provider
      value={contextValue as MultiStepFormContextValue<FieldValues>}
    >
      <FormProvider {...form}>
        <div className='min-h-screen bg-white flex flex-col items-center justify-center p-4 font-inter'>
          <div className='w-full max-w-sm'>
            <div
              className={cn(
                "px-6 pt-6 pb-4 border-b border-sidebar",
                isFirstStep && "hidden",
              )}
            >
              <p className='text-xs uppercase tracking-widest'>
                Step {currentStepIndex + 1} of {steps.length}
              </p>
              <h2 className='font-bold text-lg mt-0.5 leading-tight'>
                {currentStep.title}
              </h2>
              <p className='text-sm mt-0.5'>{currentStep.subtitle}</p>
            </div>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className='p-6 space-y-6'
            >
              <div
                key={currentStep.id}
                className='animate-in fade-in slide-in-from-right-4 duration-200'
              >
                {stepComponents[currentStep.id]}
              </div>
              <FormNavigation finalButtonLabel={finalButtonLabel} />
            </form>
          </div>

          {footerText && (
            <p className='text-center text-xs mt-6'>{footerText}</p>
          )}
        </div>
      </FormProvider>
    </MultiStepFormContext.Provider>
  );
}
