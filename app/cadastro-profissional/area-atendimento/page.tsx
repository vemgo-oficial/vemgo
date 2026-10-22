
"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  getNextProfessionalOnboardingStep,
  getProfessionalOnboardingRoute,
  PROFESSIONAL_ONBOARDING_STEPS,
} from "@/lib/professional-onboarding";

type Region = {
  id?: string;
  city: string;
  state: string;
  country: string;
  max_distance_km: number;
  is_active: boolean;
};

const DEFAULT_DISTANCE = 20;
const TOTAL_STEPS = 9;

export default function CadastroProfissionalAreaAtendimentoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [region, setRegion] = useState<Region>({
    city: "",
    state: "",
    country: "Brasil",
    max_distance_km: DEFAULT_DISTANCE,
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const progressStep = PROFESSIONAL_ONBOARDING_STEPS.SERVICE_AREA;

  useEffect(() => {
    let cancelled = false;

    async function loadRegion() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          router.replace("/login?role=professional");
          return;
        }

        const { data, error: regionError } = await supabase
          .from("professional_regions")
          .select("id, city, state, country, max_distance_km, is_active")
          .eq("professional_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (regionError) {
          setError(
            `Não foi possível carregar sua área de atendimento: ${regionError.message}`,
          );
          return;
        }

        if (data) {
          setRegion({
            id: data.id,
            city: data.city ?? "",
            state: data.state ?? "",
            country: data.country ?? "Brasil",
            max_distance_km:
              Number(data.max_distance_km) || DEFAULT_DISTANCE,
            is_active: Boolean(data.is_active),
          });
        }
      } catch {
        if (!cancelled) {
          setError(
            "Ocorreu um erro inesperado ao carregar sua área de atendimento.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRegion();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  function updateField(
    field: keyof Region,
    value: string | number | boolean,
  ) {
    setRegion((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const city = region.city.trim();
    const state = region.state.trim().toUpperCase();
    const country = region.country.trim() || "Brasil";
    const distance = Number(region.max_distance_km);

    if (!city) {
      setError("Informe a cidade onde você atende.");
      return;
    }

    if (!state) {
      setError("Informe o estado.");
      return;
    }

    if (state.length !== 2) {
      setError("Informe a sigla do estado com duas letras. Ex.: SP.");
      return;
    }

    if (!Number.isFinite(distance) || distance <= 0) {
      setError("Informe uma distância de atendimento válida.");
      return;
    }

    if (distance > 500) {
      setError("A distância máxima permitida é de 500 km.");
      return;
    }

    if (!country) {
      setError("Informe o país.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?role=professional");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.user_type !== "professional"
      ) {
        setError("Não foi possível validar seu perfil profissional.");
        return;
      }

      const { error: deactivateError } = await supabase
        .from("professional_regions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("professional_id", user.id)
        .eq("is_active", true);

      if (deactivateError) {
        setError(
          `Não foi possível atualizar sua área de atendimento: ${deactivateError.message}`,
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("professional_regions")
        .insert({
          professional_id: user.id,
          city,
          state,
          country,
          max_distance_km: distance,
          is_active: true,
        });

      if (insertError) {
        setError(
          `Não foi possível salvar sua área de atendimento: ${insertError.message}`,
        );
        return;
      }

      const nextStep = getNextProfessionalOnboardingStep(
        PROFESSIONAL_ONBOARDING_STEPS.SERVICE_AREA,
      );

      const { error: onboardingError } = await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (onboardingError) {
        setError(
          `Área salva, mas não foi possível atualizar o progresso: ${onboardingError.message}`,
        );
        return;
      }

      setMessage("Área de atendimento salva com sucesso.");

      window.setTimeout(() => {
        router.push(getProfessionalOnboardingRoute(nextStep));
      }, 700);
    } catch {
      setError(
        "Ocorreu um erro inesperado ao salvar sua área de atendimento.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-2xl flex-col justify-center">
        <header className="mb-8">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            priority
            className="mx-auto h-auto w-[190px] object-contain"
          />

          <div className="mt-6 flex items-center">
            <p className="text-sm font-medium text-orange-400">
              Etapa {progressStep} de {TOTAL_STEPS}
            </p>
          </div>

          <div
            className="mt-3 grid grid-cols-9 gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={progressStep}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const step = index + 1;

              return (
                <div
                  key={step}
                  className={`h-1.5 rounded-full ${
                    step <= progressStep
                      ? "bg-orange-500"
                      : "bg-zinc-800"
                  }`}
                />
              );
            })}
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
              Onde você atende
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Defina sua área de atendimento
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Informe sua cidade principal e a distância máxima que aceita
              atender. Essas informações ajudam a encontrar oportunidades
              compatíveis com sua região.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-400"
            >
              {message}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
              <div className="h-20 animate-pulse rounded-xl bg-zinc-800" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Cidade principal
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={region.city}
                  onChange={(event) =>
                    updateField("city", event.target.value)
                  }
                  placeholder="Ex.: Jaú"
                  autoComplete="address-level2"
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Estado (UF)
                </label>

                <input
                  id="state"
                  name="state"
                  type="text"
                  value={region.state}
                  onChange={(event) =>
                    updateField("state", event.target.value.toUpperCase())
                  }
                  placeholder="Ex.: SP"
                  maxLength={2}
                  autoComplete="address-level1"
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 uppercase text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  País
                </label>

                <input
                  id="country"
                  name="country"
                  type="text"
                  value={region.country}
                  onChange={(event) =>
                    updateField("country", event.target.value)
                  }
                  autoComplete="country-name"
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label
                    htmlFor="distance"
                    className="text-sm font-medium text-zinc-200"
                  >
                    Distância máxima de atendimento
                  </label>

                  <span className="shrink-0 text-sm font-semibold text-orange-400">
                    {region.max_distance_km} km
                  </span>
                </div>

                <input
                  id="distance"
                  name="distance"
                  type="range"
                  min={1}
                  max={500}
                  step={1}
                  value={region.max_distance_km}
                  onChange={(event) =>
                    updateField(
                      "max_distance_km",
                      Number(event.target.value),
                    )
                  }
                  disabled={saving}
                  className="w-full cursor-pointer accent-orange-500 disabled:opacity-60"
                />

                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>1 km</span>
                  <span>500 km</span>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm font-semibold text-zinc-200">
                    Como funciona?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    A distância informada será utilizada como referência
                    para encontrar oportunidades de serviços na sua região.
                    A disponibilidade de cada oportunidade ainda dependerá
                    das regras da plataforma.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/cadastro-profissional/disponibilidade",
                    )
                  }
                  disabled={saving}
                  className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar e continuar"}
                </button>
              </div>
            </form>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Você poderá atualizar sua área de atendimento posteriormente.
        </p>
      </div>
    </main>
  );
}
