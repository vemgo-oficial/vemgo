"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { OnboardingStepper } from "@/components/vemgo/OnboardingStepper";
import { Button } from "@/components/ui/Button";

type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category_id: string;
};

export default function CadastroProfissionalCompetenciasPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data: serviceData, error: serviceError } =
        await supabase
          .from("services")
          .select(
            "id, code, name, description, category_id",
          )
          .eq("is_active", true)
          .order("name", { ascending: true });

      if (cancelled) return;

      if (serviceError) {
        setError(
          `Não foi possível carregar os serviços: ${serviceError.message}`,
        );
        setLoading(false);
        return;
      }

      setServices(serviceData ?? []);

      const {
        data: professionalServices,
        error: professionalError,
      } = await supabase
        .from("professional_services")
        .select("service_id")
        .eq("professional_id", user.id);

      if (cancelled) return;

      if (professionalError) {
        setError(
          `Não foi possível carregar suas competências: ${professionalError.message}`,
        );
        setLoading(false);
        return;
      }

      setSelectedServices(
        (professionalServices ?? []).map(
          (item) => item.service_id,
        ),
      );

      setLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const groupedServices = useMemo(() => {
    const groups = new Map<string, Service[]>();

    for (const service of services) {
      const current =
        groups.get(service.category_id) ?? [];

      current.push(service);
      groups.set(service.category_id, current);
    }

    return Array.from(groups.entries());
  }, [services]);

  function toggleService(serviceId: string) {
    setError("");
    setMessage("");

    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    if (selectedServices.length === 0) {
      setError(
        "Selecione pelo menos um serviço que você está habilitado a executar.",
      );
      return;
    }

    setSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from("professional_services")
        .delete()
        .eq("professional_id", userId);

      if (deleteError) {
        throw new Error(
          `Não foi possível atualizar suas competências: ${deleteError.message}`,
        );
      }

      const rows = selectedServices.map((serviceId) => ({
        professional_id: userId,
        service_id: serviceId,
      }));

      const { error: insertError } = await supabase
        .from("professional_services")
        .insert(rows);

      if (insertError) {
        throw new Error(
          `Não foi possível salvar suas competências: ${insertError.message}`,
        );
      }

      const { error: onboardingError } = await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 6,
        })
        .eq("id", userId);

      if (onboardingError) {
        throw new Error(
          `Não foi possível atualizar o progresso do cadastro: ${onboardingError.message}`,
        );
      }

      setMessage(
        "Competências salvas. Vamos configurar seus preços…",
      );

      setTimeout(() => {
        router.push("/cadastro-profissional/precos");
      }, 700);
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível salvar suas competências.";

      setError(errorMessage);
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-text-primary">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="mb-8 text-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="mx-auto h-auto w-[190px] object-contain"
              priority
            />
          </div>

          <OnboardingStepper
            currentStep={5}
            totalSteps={9}
          />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Suas competências
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
            Selecione os serviços que você está habilitado e
            preparado para executar pela VemGO.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-surface-1 p-6 shadow-lg"
        >
          {loading ? (
            <div className="py-16 text-center text-sm text-text-secondary">
              Carregando serviços…
            </div>
          ) : services.length === 0 ? (
            <div
              role="status"
              className="rounded-xl border border-warning/20 bg-warning-soft px-4 py-4 text-sm text-warning"
            >
              Nenhum serviço disponível para seleção no
              momento.
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Serviços disponíveis
                  </h2>

                  <p className="mt-1 text-sm text-text-tertiary">
                    Você poderá selecionar mais de um serviço.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-vemgo-orange-border bg-vemgo-orange-soft px-3 py-1.5 text-xs font-medium text-vemgo-orange">
                  {selectedServices.length}{" "}
                  {selectedServices.length === 1
                    ? "selecionado"
                    : "selecionados"}
                </div>
              </div>

              <div className="space-y-6">
                {groupedServices.map(
                  ([categoryId, categoryServices]) => (
                    <section
                      key={categoryId}
                      className="rounded-xl border border-white/10 bg-surface-2 p-4"
                    >
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-vemgo-orange">
                        Serviços
                      </h3>

                      <div className="space-y-2">
                        {categoryServices.map((service) => {
                          const selected =
                            selectedServices.includes(
                              service.id,
                            );

                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() =>
                                toggleService(service.id)
                              }
                              aria-pressed={selected}
                              className={[
                                "w-full rounded-xl border p-4 text-left",
                                "transition-colors duration-180",
                                "focus-visible:outline-none",
                                "focus-visible:ring-2",
                                "focus-visible:ring-vemgo-orange",
                                selected
                                  ? "border-vemgo-orange bg-vemgo-orange-soft"
                                  : "border-white/10 bg-surface-0 hover:border-white/20",
                              ].join(" ")}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  aria-hidden="true"
                                  className={[
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                    selected
                                      ? "border-vemgo-orange bg-vemgo-orange text-black"
                                      : "border-white/20 bg-surface-3",
                                  ].join(" ")}
                                >
                                  {selected && (
                                    <span className="text-xs font-black">
                                      ✓
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-white">
                                      {service.name}
                                    </span>

                                    <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                                      {service.code}
                                    </span>
                                  </div>

                                  {service.description && (
                                    <p className="mt-1 text-xs leading-5 text-text-tertiary">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ),
                )}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-surface-2 px-4 py-4">
                <p className="text-sm font-medium text-white">
                  Sobre o preço
                </p>

                <p className="mt-1 text-xs leading-5 text-text-tertiary">
                  A VemGO poderá sugerir um preço para cada
                  serviço com base nos parâmetros da plataforma.
                  O preço final será definido e confirmado por
                  você.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-5 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
                >
                  {message}
                </div>
              )}

              <div className="mt-6">
                <Button
                  type="submit"
                  variant="professional"
                  size="lg"
                  loading={saving}
                  fullWidth
                >
                  Salvar e continuar
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-text-tertiary">
          Selecione apenas os serviços que você realmente
          consegue executar.
        </p>
      </div>
    </main>
  );
}