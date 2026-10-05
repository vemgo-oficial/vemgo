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

export default function ProfissionalPrecosPage() {
  const router = useRouter();

  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [name, setName] = useState("Profissional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, user_type, status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError || !profile) {
        router.replace("/login");
        return;
      }

      if (profile.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (profile.user_type === "client") {
        router.replace("/cliente");
        return;
      }

      if (profile.user_type === "admin") {
        router.replace("/controle");
        return;
      }

      if (profile.user_type === "company") {
        router.replace("/empresa");
        return;
      }

      if (profile.user_type !== "professional") {
        router.replace("/login");
        return;
      }

      setName(profile.full_name || "Profissional");

      const { data: servicesData, error: servicesError } =
        await supabase
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

      if (cancelled) {
        return;
      }

      if (servicesError) {
        setError(
          `Não foi possível carregar seus serviços: ${servicesError.message}`,
        );
        setLoading(false);
        return;
      }

      const { data: pricesData, error: pricesError } =
        await supabase
          .from("service_prices")
          .select("service_id, price")
          .eq("professional_id", user.id)
          .eq("is_active", true);

      if (cancelled) {
        return;
      }

      if (pricesError) {
        setError(
          `Não foi possível carregar seus preços: ${pricesError.message}`,
        );
        setLoading(false);
        return;
      }

      const loadedServices: ProfessionalService[] = (servicesData || [])
        .map((item) => {
          const service = Array.isArray(item.services)
            ? item.services[0]
            : item.services;

          if (!service) {
            return null;
          }

          const existingPrice = (pricesData || []).find(
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

      loadedServices.forEach((service) => {
        if (service.price !== null) {
          initialPrices[service.service_id] = service.price
            .toFixed(2)
            .replace(".", ",");
        } else {
          initialPrices[service.service_id] = "";
        }
      });

      if (cancelled) {
        return;
      }

      setServices(loadedServices);
      setPrices(initialPrices);
      setLoading(false);
    }

    void loadPrices();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handlePriceChange(serviceId: string, value: string) {
    setMessage("");
    setError("");

    const normalized = value
      .replace(/[^\d,]/g, "")
      .replace(/(,.*),/g, "$1");

    setPrices((current) => ({
      ...current,
      [serviceId]: normalized,
    }));
  }

  async function handleSave() {
    setMessage("");
    setError("");

    for (const service of services) {
      const value = prices[service.service_id]?.trim();

      if (!value) {
        setError(
          `Informe o preço do serviço ${service.code} - ${service.name}.`,
        );
        return;
      }

      const numericValue = Number(
        value.replace(/\./g, "").replace(",", "."),
      );

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        setError(
          `O preço do serviço ${service.code} é inválido.`,
        );
        return;
      }
    }

    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type, status")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.user_type !== "professional" ||
      profile.status !== "active"
    ) {
      router.replace("/login");
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
      setSaving(false);
      return;
    }

    const rows = services.map((service) => ({
      professional_id: user.id,
      service_id: service.service_id,
      price: Number(
        prices[service.service_id]
          .replace(/\./g, "")
          .replace(",", "."),
      ),
      currency: "BRL",
      valid_from: new Date().toISOString(),
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from("service_prices")
      .insert(rows);

    if (insertError) {
      setError(
        `Não foi possível salvar os preços: ${insertError.message}`,
      );
      setSaving(false);
      return;
    }

    setMessage("Preços salvos com sucesso.");
    setSaving(false);
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          Carregando preços...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0C0A09] text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={190}
              height={64}
              priority
              unoptimized
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-zinc-500">
                Preços dos serviços
              </div>

              <div className="text-sm text-zinc-300">
                Olá,{" "}
                <span className="font-semibold text-white">
                  {name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/profissional")}
          className="text-sm font-semibold text-orange-400 transition hover:text-orange-300"
        >
          ← Voltar para minha área
        </button>

        <div className="mt-6">
          <div className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-orange-400">
            SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
          </div>

          <h1 className="mt-5 text-3xl font-bold">
            Preços dos serviços
          </h1>

          <p className="mt-2 max-w-3xl text-zinc-400">
            Informe o preço que será utilizado para cada serviço
            que você oferece pela VemGO.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-orange-900 bg-orange-950/30 px-4 py-3 text-sm text-orange-300">
            {message}
          </div>
        )}

        {services.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-8">
            <h2 className="text-xl font-semibold">
              Nenhum serviço selecionado
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Primeiro selecione os serviços e competências que
              você oferece.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/profissional/servicos")
              }
              className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black transition hover:bg-orange-400"
            >
              Cadastrar serviços
            </button>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6">
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.service_id}
                  className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-orange-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-orange-400">
                      {service.code}
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {service.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      R$
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={prices[service.service_id] || ""}
                      onChange={(event) =>
                        handlePriceChange(
                          service.service_id,
                          event.target.value,
                        )
                      }
                      placeholder="0,00"
                      className="w-32 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-right text-white outline-none transition focus:border-orange-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">
                Serviços cadastrados: {services.length}
              </p>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar preços"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}