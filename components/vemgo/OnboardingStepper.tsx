"use client";

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps?: number;
}

const stepLabels = [
  "Dados",
  "Endereço",
  "Foto",
  "Identidade",
  "Competências",
  "Preços",
  "Disponibilidade",
  "Área",
  "Plano",
];

export function OnboardingStepper({
  currentStep,
  totalSteps = 9,
}: OnboardingStepperProps) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          Etapa {currentStep} de {totalSteps}
        </span>

        <span className="text-xs text-text-tertiary">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {stepLabels.slice(0, totalSteps).map((label, index) => {
          const step = index + 1;

          const completed = step < currentStep;
          const active = step === currentStep;

          return (
            <div
              key={label}
              className="flex min-w-0 flex-1 flex-col gap-2"
            >
              <div
                className={[
                  "h-1.5 rounded-full transition-colors duration-180",
                  completed || active
                    ? "bg-vemgo-orange"
                    : "bg-white/10",
                ].join(" ")}
              />

              <span
                className={[
                  "hidden truncate text-[11px] sm:block",
                  active
                    ? "font-medium text-vemgo-orange"
                    : completed
                      ? "text-text-secondary"
                      : "text-text-tertiary",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}