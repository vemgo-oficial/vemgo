
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Service = {
  id: string;
  category_id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
};

const TOTAL_STEPS = 9;
const CURRENT_STEP = 5;

export default function ProfessionalCompetenciesPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set(),
  );

  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !user) {
          router.replace(
            "/login?redirect=/cadastro-profissional/competencias",
          );
          return;
        }

        const [
          categoriesResult,
          servicesResult,
          professionalServicesResult,
        ] = await Promise.all([
          supabase
            .from("categories")
            .select("id, name, slug")
            .eq("is_active", true)
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("services")
            .select("id, category_id, code, name, slug, description")
            .eq("is_active", true)
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("professional_services")
            .select("service_id")
            .eq("professional_id", user.id)
            .eq("is_active", true),
        ]);

        if (cancelled) return;

        if (categoriesResult.error || servicesResult.error) {
          setError("Não foi possível carregar os serviços disponíveis.");
          return;
        }

        if (professionalServicesResult.error) {
          setError("Não foi possível carregar suas competências salvas.");
          return;
        }

        setCategories(categoriesResult.data ?? []);
        setServices(servicesResult.data ?? []);
        setSelectedServices(
          new Set(
            (professionalServicesResult.data ?? []).map(
              (item) => item.service_id,
            ),
          ),
        );
      } catch {
        if (!cancelled) {
          setError("Ocorreu um erro ao carregar os serviços. Tente novamente.");
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

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return services.filter((service) => {
      const matchesCategory = selectedCategory
        ? service.category_id === selectedCategory
        : true;

      const searchableText =
        `${service.code} ${service.name} ${service.description ?? ""}`.toLowerCase();

      const matchesSearch = normalizedSearch
        ? searchableText.includes(normalizedSearch)
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, services]);

  function toggleService(serviceId: string) {
    setSelectedServices((current) => {
      const next = new Set(current);

      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }

      return next;
    });

    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (selectedServices.size === 0) {
      setError("Selecione pelo menos um serviço que você realiza.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(
          "/login?redirect=/cadastro-profissional/competencias",
        );
        return;
      }

      const { error: deactivateError } = await supabase
        .from("professional_services")
        .update({ is_active: false })
        .eq("professional_id", user.id);

      if (deactivateError) {
        setError("Não foi possível atualizar suas competências.");
        return;
      }

      const rows = Array.from(selectedServices).map((serviceId) => ({
        professional_id: user.id,
        service_id: serviceId,
        is_active: true,
      }));

      const { error: insertError } = await supabase
        .from("professional_services")
        .upsert(rows, {
          onConflict: "professional_id,service_id",
        });

      if (insertError) {
        setError("Não foi possível salvar suas competências.");
        return;
      }

      router.push("/cadastro-profissional/precos");
    } catch {
      setError("Ocorreu um erro ao salvar suas competências. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-8 max-w-md text-center">
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
        </header>

        <section className="mt-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quais serviços você realiza?
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Selecione todos os serviços que você está preparado para
              realizar. Os serviços disponíveis são definidos pela VemGO.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-sm text-zinc-400">
                Carregando serviços...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Categorias
                  </p>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("")}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                        !selectedCategory
                          ? "bg-orange-500/10 text-orange-400"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      Todas as categorias
                    </button>

                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                          selectedCategory === category.id
                            ? "bg-orange-500/10 text-orange-400"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="min-w-0 space-y-5">
                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label
                          htmlFor="serviceSearch"
                          className="mb-2 block text-sm font-semibold text-zinc-200"
                        >
                          Buscar serviço
                        </label>

                        <input
                          id="serviceSearch"
                          type="search"
                          placeholder="Ex.: instalação de tomada"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 sm:min-w-32">
                        <div>
                          <p className="text-xs text-zinc-400">
                            Serviços selecionados
                          </p>
                          <p className="mt-0.5 text-lg font-bold text-orange-400">
                            {selectedServices.size}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {filteredServices.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredServices.map((service) => {
                        const selected = selectedServices.has(service.id);

                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            aria-pressed={selected}
                            className={`rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-orange-500/50 bg-orange-500/10"
                                : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                                  selected
                                    ? "border-orange-500 bg-orange-500 text-black"
                                    : "border-zinc-700 bg-zinc-950 text-transparent"
                                }`}
                              >
                                ✓
                              </span>

                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-500">
                                  {service.code}
                                </p>

                                <p className="mt-1 font-semibold text-white">
                                  {service.name}
                                </p>

                                {service.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
                      <p className="font-semibold text-zinc-300">
                        Nenhum serviço encontrado.
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Tente outra busca ou selecione outra categoria.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        router.push("/cadastro-profissional/identidade")
                      }
                      disabled={saving}
                      className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Voltar
                    </button>

                    <button
                      type="submit"
                      disabled={saving || loading}
                      className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Salvando..." : "Salvar e continuar"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
