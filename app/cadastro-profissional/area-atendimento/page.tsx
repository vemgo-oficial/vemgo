"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfessionalRegion = {
  id: string;
  professional_id: string;
  city: string;
  state: string;
  country: string;
  max_distance_km: number;
  is_active: boolean;
};

export default function CadastroProfissionalAreaAtendimentoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");
  const [regionId, setRegionId] = useState("");

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("BR");
  const [distance, setDistance] = useState("20");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRegion() {
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

      setUserId(user.id);

      const { data: region, error: regionError } =
        await supabase
          .from("professional_regions")
          .select(
            "id, professional_id, city, state, country, max_distance_km, is_active",
          )
          .eq("professional_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (regionError) {
        setError(
          `Não foi possível carregar sua área de atendimento: ${regionError.message}`,
        );
        setLoading(false);
        return;
      }

      if (region) {
        const typedRegion = region as ProfessionalRegion;

        setRegionId(typedRegion.id);
        setCity(typedRegion.city || "");
        setState(typedRegion.state || "");
        setCountry(typedRegion.country || "BR");
        setDistance(
          String(typedRegion.max_distance_km ?? 20),
        );
      }

      setLoading(false);
    }

    void loadRegion();
  }, [router, supabase]);

  async function handleSave() {
    setError("");
    setMessage("");

    const normalizedCity = city.trim();
    const normalizedState = state.trim().toUpperCase();
    const normalizedCountry = country.trim().toUpperCase();
    const numericDistance = Number(distance);

    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    if (!normalizedCity) {
      setError("Informe sua cidade de atendimento.");
      return;
    }

    if (!normalizedState) {
      setError("Informe seu estado.");
      return;
    }

    if (
      !Number.isFinite(numericDistance) ||
      numericDistance <= 0 ||
      numericDistance > 200
    ) {
      setError(
        "Informe um raio de atendimento entre 1 e 200 km.",
      );
      return;
    }

    setSaving(true);

    let saveError = null;

    if (regionId) {
      const { error: updateError } = await supabase
        .from("professional_regions")
        .update({
          city: normalizedCity,
          state: normalizedState,
          country: normalizedCountry || "BR",
          max_distance_km: numericDistance,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", regionId)
        .eq("professional_id", userId);

      saveError = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("professional_regions")
        .insert({
          professional_id: userId,
          city: normalizedCity,
          state: normalizedState,
          country: normalizedCountry || "BR",
          max_distance_km: numericDistance,
          is_active: true,
        })
        .select("id")
        .single();

      saveError = insertError;

      if (data?.id) {
        setRegionId(data.id);
      }
    }

    if (saveError) {
      setError(
        `Não foi possível salvar sua área de atendimento: ${saveError.message}`,
      );
      setSaving(false);
      return;
    }

    setMessage("Área de atendimento salva com sucesso.");
    setSaving(false);

    setTimeout(() => {
      router.push("/cadastro-profissional/plano");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
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
            Etapa 8 de 9
          </p>

          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 flex-1 rounded-full bg-orange-500"
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Área de atendimento
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Defina onde você deseja receber oportunidades de
            serviços pela VemGO.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Carregando sua área de atendimento...
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="city"
                  className="text-sm font-medium text-white"
                >
                  Cidade
                </label>

                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                  placeholder="Ex.: Jaú"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="state"
                  className="text-sm font-medium text-white"
                >
                  Estado
                </label>

                <input
                  id="state"
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(event) =>
                    setState(
                      event.target.value
                        .replace(/[^a-zA-Z]/g, "")
                        .toUpperCase(),
                    )
                  }
                  placeholder="SP"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white uppercase outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="distance"
                  className="text-sm font-medium text-white"
                >
                  Raio de atendimento
                </label>

                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="distance"
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={distance}
                    onChange={(event) =>
                      setDistance(event.target.value)
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />

                  <span className="text-sm text-zinc-400">
                    km
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Você receberá oportunidades dentro desse
                  raio, considerando sua área cadastrada.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-orange-900/50 bg-orange-950/20 px-4 py-4">
                <p className="text-sm font-medium text-orange-300">
                  Como funciona
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  A VemGO utilizará sua localização de
                  atendimento, suas competências, disponibilidade
                  e outros critérios para identificar
                  oportunidades compatíveis.
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
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Salvar e continuar →"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Você poderá atualizar sua área de atendimento
          posteriormente.
        </p>
      </div>
    </main>
  );
}