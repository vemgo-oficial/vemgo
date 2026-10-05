"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfessionalService = {
  service_id: string;
  code: string;
  name: string;
  price: number | null;
};

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
    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.user_type !== "professional"
      ) {
        router.replace("/login");
        return;
      }

      const {
        data: professionalServices,
        error: servicesError,
      } = await supabase
        .from("professional_services")
        .select(`
          service_id,
          services (
            code,
            name
          )
        `)
        .eq("professional_id", user.id)
        .eq("is_active", true);

      if (servicesError) {
        setError(
          `Não foi possível carregar suas competências: ${servicesError.message}`,
        );
        setLoading(false);
        return;
      }

      const {
        data: existingPrices,
        error: pricesError,
      } = await supabase
        .from("service_prices")
        .select("service_id, price")
        .eq("professional_id", user.id)
        .eq("is_active", true);

      if (pricesError) {
        setError(
          `Não foi possível carregar seus preços: ${pricesError.message}`,
        );
        setLoading(false);
        return;
      }

      const loadedServices: ProfessionalService[] = (
        professionalServices ?? []
      )
        .map((item) => {
          const service = Array.isArray(item.services)
            ? item.services[0]
            : item.services;

          if (!service) {
            return null;
          }

          const existingPrice = (
            existingPrices ?? []
          ).find(
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
          (item): item is ProfessionalService =>
            item !== null,
        )
        .sort((a, b) =>
          a.code.localeCompare(b.code),
        );

      if (loadedServices.length === 0) {
        setError(
          "Nenhum serviço foi encontrado. Volte para competências e selecione pelo menos um serviço.",
        );
        setLoading(false);
        return;
      }

      const initialPrices: Record<string, string> = {};

      for (const service of loadedServices) {
        initialPrices[service.service_id] =
          service.price !== null
            ? service.price
                .toFixed(2)
                .replace(".", ",")
            : "";
      }

      setServices(loadedServices);
      setPrices(initialPrices);
      setLoading(false);
    }

    void loadData();
  }, [router, supabase]);

  function handlePriceChange(
    serviceId: string,
    value: string,
  ) {
    setError("");
    setMessage("");

    let normalized = value.replace(/[^\d,]/g, "");

    const firstComma = normalized.indexOf(",");

    if (firstComma !== -1) {
      normalized =
        normalized.slice(0, firstComma + 1) +
        normalized
          .slice(firstComma + 1)
          .replace(/,/g, "");
    }

    if (normalized.includes(",")) {
      const [integerPart, decimalPart] =
        normalized.split(",");

      normalized =
        integerPart +
        "," +
        decimalPart.slice(0, 2);
    }

    setPrices((current) => ({
      ...current,
      [serviceId]: normalized,
    }));
  }

  function parsePrice(value: string) {
    return Number(
      value
        .replace(/\./g, "")
        .replace(",", "."),
    );
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    for (const service of services) {
      const value =
        prices[service.service_id]?.trim();

      if (!value) {
        setError(
          `Informe o preço do serviço ${service.code} - ${service.name}.`,
        );
        return;
      }

      const numericValue = parsePrice(value);

      if (
        !Number.isFinite(numericValue) ||
        numericValue <= 0
      ) {
        setError(
          `O preço do serviço ${service.code} é inválido.`,
        );
        return;
      }
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Usuário não identificado.");
      setSaving(false);
      router.replace("/login");
      return;
    }

    const { error: deactivateError } =
      await supabase
        .from("service_prices")
        .update({ is_active: false })
        .eq("professional_id", user.id)
        .eq("is_active", true);

    if (deactivateError) {
      setError(
        `Não foi possível atualizar os preços: ${deactivateError.message}`,
      );
      setSaving(false);
      return;
    }

    const rows = services.map((service) => ({
      professional_id: user.id,
      service_id: service.service_id,
      price: parsePrice(
        prices[service.service_id],
      ),
      currency: "BRL",
      valid_from: new Date().toISOString(),
      is_active: true,
    }));

    const { error: insertError } =
      await supabase
        .from("service_prices")
        .insert(rows);

    if (insertError) {
      setError(
        `Não foi possível salvar os preços: ${insertError.message}`,
      );
      setSaving(false);
      return;
    }

    setMessage(
      "Preços salvos com sucesso.",
    );

    setSaving(false);

    setTimeout(() => {
      router.push(
        "/cadastro-profissional/disponibilidade",
      );
    }, 800);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <p className="text-sm text-zinc-400">
            Carregando seus serviços...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Image
            src="/logo-vemgo.png"
            alt="VemGO"
            width={360}
            height={200}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <p className="mt-6 text-sm font-medium text-orange-400">
            Etapa 6 de 9
          </p>

          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: 7 }).map(
              (_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index < 6
                      ? "bg-orange-500"
                      : "bg-zinc-800"
                  }`}
                />
              ),
            )}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Seus preços
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Defina quanto você cobra por cada serviço
            que oferece pela VemGO.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Serviços selecionados
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Informe o preço final que você deseja
              cobrar por cada serviço.
            </p>
          </div>

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

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    R$
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      prices[service.service_id] ??
                      ""
                    }
                    onChange={(event) =>
                      handlePriceChange(
                        service.service_id,
                        event.target.value,
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-12 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-4">
            <p className="text-sm font-medium text-white">
              Como funciona o preço
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              A VemGO poderá utilizar inteligência
              artificial e outros parâmetros da
              plataforma para sugerir uma referência
              de preço para cada serviço.
            </p>

            <p className="mt-2 text-xs leading-5 text-orange-300">
              O preço final é definido e confirmado
              por você, profissional.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-green-900/60 bg-green-950/30 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Salvando preços..."
              : "Salvar e continuar →"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Você poderá atualizar seus preços
          posteriormente.
        </p>
      </div>
    </main>
  );
}