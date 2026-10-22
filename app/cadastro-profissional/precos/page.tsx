
"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfessionalService = {
  service_id: string;
  code: string;
  name: string;
  price: number | null;
};

const TOTAL_STEPS = 9;
const CURRENT_STEP = 6;

function parsePrice(value: string): number {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CadastroProfissionalPrecosPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (
          profileError ||
          !profile ||
          profile.user_type !== "professional"
        ) {
          router.replace("/login");
          return;
        }

        const [
          servicesResult,
          pricesResult,
        ] = await Promise.all([
          supabase
            .from("professional_services")
            .select(`
              service_id,
              services (
                code,
                name
              )
            `)
            .eq("professional_id", user.id)
            .eq("is_active", true),

          supabase
            .from("service_prices")
            .select("service_id, price")
            .eq("professional_id", user.id)
            .eq("is_active", true),
        ]);

        if (cancelled) return;

        if (servicesResult.error) {
          setError(
            `Não foi possível carregar suas competências: ${servicesResult.error.message}`,
          );
          return;
        }

        if (pricesResult.error) {
          setError(
            `Não foi possível carregar seus preços: ${pricesResult.error.message}`,
          );
          return;
        }

        const existingPrices = pricesResult.data ?? [];

        const loadedServices: ProfessionalService[] = (
          servicesResult.data ?? []
        )
          .map((item) => {
            const service = Array.isArray(item.services)
              ? item.services[0]
              : item.services;

            if (!service) return null;

            const existingPrice = existingPrices.find(
              (price) => price.service_id === item.service_id,
            );

            return {
              service_id: item.service_id,
              code: service.code,
              name: service.name,
              price: existingPrice?.price ?? null,
            };
          })
          .filter(
            (item): item is ProfessionalService => item !== null,
          )
          .sort((a, b) => a.code.localeCompare(b.code));

        const initialPrices: Record<string, string> = {};

        for (const service of loadedServices) {
          initialPrices[service.service_id] =
            service.price !== null
              ? formatPrice(service.price)
              : "";
        }

        setServices(loadedServices);
        setPrices(initialPrices);
      } catch {
        if (!cancelled) {
          setError(
            "Ocorreu um erro ao carregar seus serviços. Tente novamente.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  function handlePriceChange(serviceId: string, value: string) {
    setError("");
    setMessage("");

    let normalized = value.replace(/[^\d,]/g, "");
    const firstComma = normalized.indexOf(",");

    if (firstComma !== -1) {
      normalized =
        normalized.slice(0, firstComma + 1) +
        normalized.slice(firstComma + 1).replace(/,/g, "");

      const [integerPart, decimalPart = ""] = normalized.split(",");

      normalized = `${integerPart},${decimalPart.slice(0, 2)}`;
    }

    setPrices((current) => ({
      ...current,
      [serviceId]: normalized,
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (services.length === 0) {
      setError(
        "Você ainda não possui serviços selecionados. Volte à etapa de competências e selecione pelo menos um serviço.",
      );
      return;
    }

    const parsedPrices: Record<string, number> = {};

    for (const service of services) {
      const value = prices[service.service_id]?.trim();

      if (!value) {
        setError(
          `Informe o preço do serviço ${service.code} - ${service.name}.`,
        );
        return;
      }

      const numericValue = parsePrice(value);

      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        setError(
          `O preço do serviço ${service.code} deve ser maior que zero.`,
        );
        return;
      }

      parsedPrices[service.service_id] = numericValue;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, status")
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

      if (profile.status === "blocked") {
        setError("Seu perfil está bloqueado. Entre em contato com o suporte.");
        return;
      }

      const { error: deactivateError } = await supabase
        .from("service_prices")
        .update({ is_active: false })
        .eq("professional_id", user.id)
        .eq("is_active", true);

      if (deactivateError) {
        setError(
          `Não foi possível atualizar os preços: ${deactivateError.message}`,
        );
        return;
      }

      const now = new Date().toISOString();

      const rows = services.map((service) => ({
        professional_id: user.id,
        service_id: service.service_id,
        price: parsedPrices[service.service_id],
        currency: "BRL",
        valid_from: now,
        is_active: true,
      }));

      const { error: insertError } = await supabase
        .from("service_prices")
        .insert(rows);

      if (insertError) {
        setError(
          `Não foi possível salvar os preços: ${insertError.message}`,
        );
        return;
      }

      const { error: stepError } = await supabase
        .from("profiles")
        .update({ professional_onboarding_step: 7 })
        .eq("id", user.id);

      if (stepError) {
        setMessage(
          "Preços salvos. Não foi possível atualizar o progresso do cadastro; você poderá continuar pela próxima etapa.",
        );
        return;
      }

      setMessage("Preços salvos com sucesso.");

      window.setTimeout(() => {
        router.push("/cadastro-profissional/disponibilidade");
      }, 800);
    } catch {
      setError(
        "Ocorreu um erro inesperado ao salvar os preços. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-3xl flex-col justify-center">
        <header className="mb-8 text-center">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <div className="mt-6 flex items-center">
            <p className="text-sm font-medium text-orange-400">
              Etapa {CURRENT_STEP} de {TOTAL_STEPS}
            </p>
          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={CURRENT_STEP}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < CURRENT_STEP ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            Seus preços
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Defina quanto você cobra por cada serviço que oferece pela VemGO.
          </p>
        </header>

        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm sm:p-7"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Serviços selecionados
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Informe o preço que você deseja cobrar por cada serviço. Você
              poderá revisar seus valores antes de concluir o cadastro.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <p className="text-sm text-zinc-400">
                Carregando seus serviços e preços...
              </p>
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm leading-6 text-zinc-300">
                Nenhum serviço ativo foi encontrado no seu cadastro.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/cadastro-profissional/competencias")
                }
                className="mt-4 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900"
              >
                Voltar para competências
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.service_id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {service.name}
                        </span>

                        <span className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400">
                          {service.code}
                        </span>
                      </div>
                    </div>

                    <label
                      htmlFor={`price-${service.service_id}`}
                      className="mb-2 block text-sm text-zinc-400"
                    >
                      Preço do serviço
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        R$
                      </span>

                      <input
                        id={`price-${service.service_id}`}
                        name={`price-${service.service_id}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={prices[service.service_id] ?? ""}
                        onChange={(event) =>
                          handlePriceChange(
                            service.service_id,
                            event.target.value,
                          )
                        }
                        disabled={saving}
                        placeholder="0,00"
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-12 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-4">
                <p className="text-sm font-semibold text-white">
                  Como funciona o preço
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  A VemGO poderá apresentar referências de preço quando
                  disponíveis. Essas referências são informativas.
                </p>

                <p className="mt-2 text-sm leading-6 text-orange-300">
                  O preço cadastrado é definido por você, profissional.
                  Confira o valor informado antes de salvar.
                </p>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-400"
            >
              {message}
            </div>
          )}

          {!loading && services.length > 0 && (
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push("/cadastro-profissional/competencias")
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
                {saving ? "Salvando preços..." : "Salvar e continuar"}
              </button>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Você poderá revisar seus preços posteriormente, conforme as regras
          da plataforma.
        </p>
      </div>
    </main>
  );
}
