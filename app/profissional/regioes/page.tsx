"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Region = {
  id: string;
  city: string;
  state: string;
  country: string;
  max_distance_km: number;
  is_active: boolean;
};

export default function ProfissionalRegioesPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [regions, setRegions] = useState<Region[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [maxDistance, setMaxDistance] = useState("20");
  const [name, setName] = useState("Profissional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRegions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_type, status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
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

      const { data, error: regionsError } = await supabase
        .from("professional_regions")
        .select(
          "id, city, state, country, max_distance_km, is_active",
        )
        .eq("professional_id", user.id)
        .eq("is_active", true)
        .order("city", { ascending: true });

      if (regionsError) {
        setError(
          `Não foi possível carregar suas regiões: ${regionsError.message}`,
        );
        setLoading(false);
        return;
      }

      setRegions(data || []);
      setLoading(false);
    }

    void Promise.resolve().then(loadRegions);
  }, [router, supabase]);

  function handleAddRegion() {
    setMessage("");
    setError("");

    const normalizedCity = city.trim();
    const normalizedState = state.trim().toUpperCase();
    const numericDistance = Number(
      maxDistance.replace(",", "."),
    );

    if (!normalizedCity) {
      setError("Informe a cidade.");
      return;
    }

    if (!normalizedState || normalizedState.length !== 2) {
      setError("Informe o estado com 2 letras. Ex.: SP.");
      return;
    }

    if (
      !Number.isFinite(numericDistance) ||
      numericDistance <= 0
    ) {
      setError("Informe uma distância válida maior que zero.");
      return;
    }

    const alreadyExists = regions.some(
      (region) =>
        region.city.toLowerCase() ===
          normalizedCity.toLowerCase() &&
        region.state.toUpperCase() === normalizedState,
    );

    if (alreadyExists) {
      setError("Essa região já está cadastrada.");
      return;
    }

    setRegions((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        city: normalizedCity,
        state: normalizedState,
        country: "BR",
        max_distance_km: numericDistance,
        is_active: true,
      },
    ]);

    setCity("");
    setState("");
    setMaxDistance("20");
  }

  function handleRemoveRegion(id: string) {
    setRegions((current) =>
      current.filter((region) => region.id !== id),
    );
  }

  async function handleSave() {
    setMessage("");
    setError("");

    if (regions.length === 0) {
      setError("Cadastre pelo menos uma região de atendimento.");
      return;
    }

    setSaving(true);

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
      .from("professional_regions")
      .update({ is_active: false })
      .eq("professional_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      setError(
        `Não foi possível atualizar as regiões: ${deactivateError.message}`,
      );
      setSaving(false);
      return;
    }

    const rows = regions.map((region) => ({
      professional_id: user.id,
      city: region.city,
      state: region.state,
      country: region.country,
      max_distance_km: region.max_distance_km,
      is_active: true,
    }));

    const { data: insertedRegions, error: insertError } =
      await supabase
        .from("professional_regions")
        .insert(rows)
        .select(
          "id, city, state, country, max_distance_km, is_active",
        );

    if (insertError) {
      setError(
        `Não foi possível salvar as regiões: ${insertError.message}`,
      );
      setSaving(false);
      return;
    }

    setRegions(insertedRegions || []);
    setMessage("Regiões de atendimento salvas com sucesso.");
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          Carregando regiões...
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
                Regiões de atendimento
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
            Regiões de atendimento
          </h1>

          <p className="mt-2 max-w-3xl text-zinc-400">
            Informe as cidades onde você atende e a distância
            máxima que aceita percorrer.
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

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6">
          <h2 className="text-xl font-semibold">
            Adicionar região
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Cidade
              </label>

              <input
                type="text"
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                placeholder="Ex.: Jaú"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Estado
              </label>

              <input
                type="text"
                maxLength={2}
                value={state}
                onChange={(event) =>
                  setState(event.target.value.toUpperCase())
                }
                placeholder="Ex.: SP"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white uppercase outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Distância máxima
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={maxDistance}
                  onChange={(event) =>
                    setMaxDistance(event.target.value)
                  }
                  placeholder="20"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />

                <span className="text-sm text-zinc-500">
                  km
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRegion}
            className="mt-5 rounded-xl border border-orange-600 px-5 py-3 font-semibold text-orange-400 transition hover:bg-orange-950/30"
          >
            + Adicionar região
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Minhas regiões
            </h2>

            <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
              {regions.length} região(ões)
            </span>
          </div>

          {regions.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              Nenhuma região cadastrada.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {region.city} / {region.state}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Atendimento em até{" "}
                      {region.max_distance_km} km
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveRegion(region.id)
                    }
                    className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/30"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Você poderá cadastrar mais de uma cidade.
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar regiões"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}