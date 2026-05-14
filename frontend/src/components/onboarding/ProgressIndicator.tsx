import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { cn } from "@/lib/utils";

export function ProgressIndicator() {
  const { steps, currentStepIndex, goToStep } = useMultiStepForm();

  return (
    <div className="relative flex items-center justify-between w-full">
      {/* Track line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-full bg-zinc-800" />
      {/* Filled portion */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-amber-500 transition-all duration-500 ease-out"
        style={{
          width:
            steps.length > 1
              ? `${(currentStepIndex / (steps.length - 1)) * 100}%`
              : "0%",
        }}
      />

      {steps.map((step, index) => {
        const isDone = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isAccessible = index <= currentStepIndex; // only allow going back

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isAccessible && goToStep(index)}
            disabled={!isAccessible}
            aria-label={`Step ${index + 1}: ${step.title}`}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center",
              "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
              isDone &&
                "bg-amber-500 border-amber-500 cursor-pointer hover:bg-amber-400",
              isCurrent &&
                "bg-zinc-950 border-amber-500 cursor-default scale-110",
              !isDone &&
                !isCurrent &&
                "bg-zinc-900 border-zinc-700 cursor-not-allowed"
            )}
          >
            {isDone ? (
              // Checkmark for completed steps
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 5L4.5 8.5L11 1"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  isCurrent ? "text-amber-500" : "text-zinc-600"
                )}
              >
                {index + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
