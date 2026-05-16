import { ZodType } from "zod";
import { FieldValues, Path } from "react-hook-form";

export type StepDef<TFormData extends FieldValues> = {
  id: string;
  title: string;
  subtitle: string;
  fields: Path<TFormData>[];
  schema: ZodType<unknown>;
};

export type MultiStepFormContextValue<TFormData extends FieldValues> = {
  currentStepIndex: number;
  currentStep: StepDef<TFormData>;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading: boolean;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  goToStep: (index: number) => void;
  steps: StepDef<TFormData>[];
   /** API responses keyed by step id, accumulated as the user progresses */
  stepData: Record<string, unknown>;
};