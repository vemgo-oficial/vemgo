"use client";

type OnboardingSteps = Record<string, number>;

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps?: number;
  steps?: OnboardingSteps;
  variant?: string;
}

const DEFAULT_TOTAL_STEPS = 9;

export function OnboardingStepper({
  currentStep,
  totalSteps = DEFAULT_TOTAL_STEPS,
  steps,
  variant = "professional",
}: OnboardingStepperProps) {
  const resolvedTotalSteps =
    steps && Object.keys(steps).length > 0
      ? Math.max(
          totalSteps,
          ...Object.values(steps),
        )
      : totalSteps;

  const safeCurrentStep = Math.min(
    Math.max(currentStep, 1),
    resolvedTotalSteps,
  );

  const percentage = Math.round(
    (safeCurrentStep / resolvedTotalSteps) * 100,
  );

  const progressColor =
    variant === "professional"
      ? "bg-vemgo-orange"
      : variant === "control"
        ? "bg-vemgo-blue"
        : "bg-vemgo-green";

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          Etapa {safeCurrentStep} de{" "}
          {resolvedTotalSteps}
        </span>

        <span className="text-xs text-text-tertiary">
          {percentage}%
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({
          length: resolvedTotalSteps,
        }).map((_, index) => {
          const step = index + 1;

          const completed =
            step < safeCurrentStep;

          const active =
            step === safeCurrentStep;

          return (
            <div
              key={step}
              className="min-w-0 flex-1"
            >
              <div
                className={[
                  "h-1.5 rounded-full transition-colors duration-180",
                  completed || active
                    ? progressColor
                    : "bg-white/10",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OnboardingStepper;