import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";

export function FormNavigation({
  finalButtonLabel = {
    label: "Get my credit score",
    submissionLabel: "Analyzing your data…"
  }
}) {
  const { isFirstStep, isLastStep, isLoading, prevStep, nextStep } =
    useMultiStepForm();

  return (
    <div className="flex gap-3 pt-2">
      {/* Back — hidden on first step */}
      {!isFirstStep && (
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isLoading}
          className="shrink-0 border-zinc-800 bg-transparent text-black hover:bg-zinc-900 hover:text-white hover:border-zinc-700 h-11"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      {/* Next / Submit */}
      {isLastStep ? (
        // Last step: type="submit" — triggers RHF's handleSubmit with the full schema
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-black hover:bg-black/90 text-white font-semibold transition-all h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
             { finalButtonLabel.submissionLabel}
            </>
          ) : (
            <>
              { finalButtonLabel.label }
            </>
          )}
        </Button>
      ) : (
        // All other steps: type="button" — calls nextStep() which trigger()'s current fields
        <Button
          type="button"
          onClick={nextStep}
          disabled={isLoading}
          className="flex-1 bg-black hover:bg-black/90 text-white font-semibold transition-all h-11 group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 duration-300 ease-in" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
