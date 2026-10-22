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

function parsePrice(value: string): number {

  const normalized = value.trim().replace(/\./g, "").replace(",", ".");

  return Number(normalized);

}

export default function ProfissionalPrecosPage() {

  const router = useRouter();

  const [services, setServices] = useState<ProfessionalService[]>([]);

  const [prices, setPrices] = useState<Record<string, string>>({});

  const [name, setName] = useState("Profissional");

  const [avatarUrl, setAvatarUrl] = useState("");

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

      if (cancelled) return;

      if (!user) {

        router.replace("/login");

        return;

      }

      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("full_name, avatar_url, user_type, status")

        .eq("id", user.id)

        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profile) {

        router.replace("/login");

        return;

      }

      if (profile.status === "blocked") {

        await supabase.auth.signOut();

        if (!cancelled) router.replace("/login");

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

      if (profile.user_type !== "professional") {

        router.replace("/login");

        return;

      }

      const firstName = profile.full_name?.trim().split(/\s+/)[0] || "Profissional";

      setName(firstName);

      // A página principal usa o bucket privado profile-photos e gera URL assinada.

      setAvatarUrl("");

      if (typeof profile.avatar_url === "string" && profile.avatar_url.trim()) {

        const storedAvatar = profile.avatar_url.trim();

        if (/^https?:\/\//i.test(storedAvatar)) {

          setAvatarUrl(storedAvatar);

        } else {

          const { data: signedImage, error: imageError } = await supabase.storage

            .from("profile-photos")

            .createSignedUrl(storedAvatar, 3600);

          if (cancelled) return;

          if (!imageError && signedImage?.signedUrl) {

            setAvatarUrl(signedImage.signedUrl);

          }

        }

      }

      const { data: servicesData, error: servicesError } = await supabase

        .from("professional_services")

        .select(

          `

            service_id,

            services (

              code,

              name

            )

          `,

        )

        .eq("professional_id", user.id)

        .eq("is_active", true);

      if (cancelled) return;

      if (servicesError) {

        setError(`Não foi possível carregar seus serviços: ${servicesError.message}`);

        setLoading(false);

        return;

      }

      const { data: pricesData, error: pricesError } = await supabase

        .from("service_prices")

        .select("service_id, price")

        .eq("professional_id", user.id)

        .eq("is_active", true);

      if (cancelled) return;

      if (pricesError) {

        setError(`Não foi possível carregar seus preços: ${pricesError.message}`);

        setLoading(false);

        return;

      }

      const loadedServices: ProfessionalService[] = (servicesData || [])

        .map((item) => {

          const service = Array.isArray(item.services) ? item.services[0] : item.services;

          if (!service) return null;

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

        .filter((item): item is ProfessionalService => item !== null)

        .sort((a, b) => a.code.localeCompare(b.code));

      const initialPrices: Record<string, string> = {};

      loadedServices.forEach((service) => {

        initialPrices[service.service_id] =

          service.price !== null ? service.price.toFixed(2).replace(".", ",") : "";

      });

      if (cancelled) return;

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

    // Aceita apenas números e uma vírgula decimal.

    const cleaned = value.replace(/[^\d,]/g, "");

    const commaIndex = cleaned.indexOf(",");

    const normalized =

      commaIndex === -1

        ? cleaned

        : `${cleaned.slice(0, commaIndex)},${cleaned.slice(commaIndex + 1).replace(/,/g, "")}`;

    setPrices((current) => ({ ...current, [serviceId]: normalized }));

  }

  async function handleSave() {

    setMessage("");

    setError("");

    if (services.length === 0) {

      setError("Você ainda não possui serviços selecionados para cadastrar preços.");

      return;

    }

    for (const service of services) {

      const value = prices[service.service_id]?.trim();

      if (!value) {

        setError(`Informe o preço do serviço ${service.code} - ${service.name}.`);

        return;

      }

      const numericValue = parsePrice(value);

      if (!Number.isFinite(numericValue) || numericValue < 0) {

        setError(`O preço do serviço ${service.code} é inválido.`);

        return;

      }

    }

    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      setSaving(false);

      router.replace("/login");

      return;

    }

    const { data: profile } = await supabase

      .from("profiles")

      .select("user_type, status")

      .eq("id", user.id)

      .maybeSingle();

    if (!profile || profile.user_type !== "professional" || profile.status !== "active") {

      setSaving(false);

      router.replace("/login");

      return;

    }

    const { error: deactivateError } = await supabase

      .from("service_prices")

      .update({ is_active: false })

      .eq("professional_id", user.id)

      .eq("is_active", true);

    if (deactivateError) {

      setError(`Não foi possível atualizar os preços: ${deactivateError.message}`);

      setSaving(false);

      return;

    }

    const rows = services.map((service) => ({

      professional_id: user.id,

      service_id: service.service_id,

      price: parsePrice(prices[service.service_id]),

      currency: "BRL",

      valid_from: new Date().toISOString(),

      is_active: true,

    }));

    const { error: insertError } = await supabase.from("service_prices").insert(rows);

    if (insertError) {

      setError(`Não foi possível salvar os preços: ${insertError.message}`);

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

      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">

        <div className="mx-auto max-w-6xl">

          <p className="text-sm text-zinc-400">Carregando preços...</p>

        </div>

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-[#0C0A09] text-white">

      <header className="border-b border-zinc-800 bg-black">

        <div className="mx-auto flex min-h-[132px] max-w-6xl items-center justify-between gap-6 px-6 py-5">

          <button

            type="button"

            onClick={() => router.push("/profissional")}

            className="flex shrink-0 items-center"

            aria-label="Voltar para minha área profissional"

          >

            <Image

              src="/logo-vemgo-transparente.png"

              alt="VemGO"

              width={1751}

              height={465}

              className="h-auto w-[190px] object-contain"

              priority

              unoptimized

            />

          </button>

          <div className="flex items-center gap-4 sm:gap-5">

            <div className="text-right">

              <p className="text-xs text-orange-400 sm:text-sm">Área do profissional</p>

              <p className="text-lg font-bold leading-tight text-white sm:text-2xl">

                Olá, {name}!

              </p>

              <button

                type="button"

                onClick={() => void handleLogout()}

                className="mt-1 text-sm text-zinc-400 transition hover:text-orange-400"

              >

                Sair

              </button>

            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-black">

              {avatarUrl ? (

                <Image

                  src={avatarUrl}

                  alt="Foto do profissional"

                  width={56}

                  height={56}

                  className="h-full w-full object-cover"
            unoptimized

                  onError={() => setAvatarUrl("")}

                />

              ) : (

                <span className="text-xl font-bold text-orange-400" aria-label={`Avatar de ${name}`}>

                  {name.charAt(0).toUpperCase()}

                </span>

              )}

            </div>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">

        <button

          type="button"

          onClick={() => router.push("/profissional")}

          className="mb-7 text-sm font-semibold text-orange-400 transition hover:text-orange-300"

        >

          ← Voltar para minha área

        </button>

        <div className="mb-8">

          <div className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-400">

            Preços dos serviços

          </div>

          <h1 className="mt-4 text-3xl font-bold">Preços dos serviços</h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">

            Informe o preço que será utilizado para cada serviço que você oferece pela VemGO.

          </p>

        </div>

        {error && (

          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">

            {error}

          </div>

        )}

        {message && (

          <div className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">

            {message}

          </div>

        )}

        {services.length === 0 ? (

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-8">

            <h2 className="text-xl font-semibold">Nenhum serviço selecionado</h2>

            <p className="mt-2 text-sm text-zinc-500">

              Primeiro selecione os serviços e competências que você oferece.

            </p>

            <button

              type="button"

              onClick={() => router.push("/profissional/servicos")}

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

                    <p className="text-xs font-semibold text-orange-400">{service.code}</p>

                    <p className="mt-1 font-semibold text-white">{service.name}</p>

                  </div>

                  <div className="flex items-center gap-3">

                    <span className="text-sm text-zinc-500">R$</span>

                    <input

                      type="text"

                      inputMode="decimal"

                      value={prices[service.service_id] || ""}

                      onChange={(event) => handlePriceChange(service.service_id, event.target.value)}

                      placeholder="0,00"

                      aria-label={`Preço de ${service.name}`}

                      className="w-32 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-right text-white outline-none transition focus:border-orange-500"

                    />

                  </div>

                </div>

              ))}

            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-zinc-500">Serviços cadastrados: {services.length}</p>

              <button

                type="button"

                onClick={() => void handleSave()}

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
