export const PROFESSIONAL_ONBOARDING_STEPS = {
  DATA: 1,
  ADDRESS: 2,
  PHOTO: 3,
  IDENTITY: 4,
  COMPETENCIES: 5,
  PRICES: 6,
  AVAILABILITY: 7,
  SERVICE_AREA: 8,
  PLAN: 9,
} as const;

export const PROFESSIONAL_ONBOARDING_TOTAL_STEPS = 9;

export function getProfessionalOnboardingRoute(step: number) {
  const routes: Record<number, string> = {
    1: "/cadastro-profissional",
    2: "/cadastro-profissional/endereco",
    3: "/cadastro-profissional/foto",
    4: "/cadastro-profissional/identidade",
    5: "/cadastro-profissional/competencias",
    6: "/cadastro-profissional/precos",
    7: "/cadastro-profissional/disponibilidade",
    8: "/cadastro-profissional/area-atendimento",
    9: "/cadastro-profissional/plano",
  };

  return routes[step] ?? routes[2];
}

export function getNextProfessionalOnboardingStep(
  currentStep: number,
) {
  return Math.min(
    currentStep + 1,
    PROFESSIONAL_ONBOARDING_TOTAL_STEPS,
  );
}