import { createContext, useContext } from "react";
import { FieldValues } from "react-hook-form";
import { MultiStepFormContextValue } from "@/components/multistep/types";

export const MultiStepFormContext =
  createContext<MultiStepFormContextValue<FieldValues> | null>(null);

// Trailing comma tells TS parser this is a generic, not JSX
export function useMultiStepForm<TFormData extends FieldValues,>(): MultiStepFormContextValue<TFormData> {
  const ctx = useContext(MultiStepFormContext);
  if (!ctx) {
    throw new Error("useMultiStepForm must be used inside <MultiStepForm>");
  }
  return ctx as MultiStepFormContextValue<TFormData>;
}