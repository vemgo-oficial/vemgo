
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Day = {
  id: number;
  name: string;
  enabled: boolean;
  start: string;
  end: string;
};

const initialDays: Day[] = [
  { id: 1, name: "Segunda-feira", enabled: false, start: "08:00", end: "18:00" },
  { id: 2, name: "Terça-feira", enabled: false, start: "08:00", end: "18:00" },
  { id: 3, name: "Quarta-feira", enabled: false, start: "08:00", end: "18:00" },
  { id: 4, name: "Quinta-feira", enabled: false, start: "08:00", end: "18:00" },
  { id: 5, name: "Sexta-feira", enabled: false, start: "08:00", end: "18:00" },
  { id: 6, name: "Sábado", enabled: false, start: "08:00", end: "12:00" },
  { id: 0, name: "Domingo", enabled: false, start: "08:00", end: "12:00" },
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 7;

export default function CadastroProfissionalDisponibilidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [days, setDays] = useState<Day[]>(initialDays);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
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

        const { data, error: availabilityError } = await supabase
          .from("professional_availability")
          .select("day_of_week,start_time,end_time,is_active")
          .eq("professional_id", user.id);

        if (cancelled) return;

        if (availabilityError) {
          setError(
            `Não foi possível carregar sua disponibilidade: ${availabilityError.message}`,
          );
          return;
        }

        if (data && data.length > 0) {
          setDays((current) =>
            current.map((day) => {
              const saved = data.find(
                (item) => item.day_of_week === day.id,
              );

              if (!saved) return day;

              return {
                ...day,
                enabled: saved.is_active,
                start: saved.start_time?.slice(0, 5) || day.start,
                end: saved.end_time?.slice(0, 5) || day.end,
              };
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            "Ocorreu um erro inesperado ao carregar sua disponibilidade.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  function toggleDay(dayId: number) {
    setMessage("");
    setError("");

    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? { ...day, enabled: !day.enabled }
          : day,
      ),
    );
  }

  function updateTime(
    dayId: number,
    field: "start" | "end",
    value: string,
  ) {
    setMessage("");
    setError("");

    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? { ...day, [field]: value }
          : day,
      ),
    );
  }

  async function handleSave() {
    setError("");
    setMessage("");

    const selectedDays = days.filter((day) => day.enabled);

    if (selectedDays.length === 0) {
      setError("Selecione pelo menos um dia de atendimento.");
      return;
    }

    for (const day of selectedDays) {
      if (!day.start || !day.end) {
        setError(
          `Informe o horário de atendimento de ${day.name}.`,
        );
        return;
      }

      if (day.start >= day.end) {
        setError(
          `O horário final precisa ser maior que o inicial em ${day.name}.`,
        );
        return;
      }
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
        setError(
          "Seu perfil está bloqueado. Entre em contato com o suporte.",
        );
        return;
      }

      const { error: deleteError } = await supabase
        .from("professional_availability")
        .delete()
        .eq("professional_id", user.id);

      if (deleteError) {
        setError(
          `Não foi possível atualizar sua disponibilidade: ${deleteError.message}`,
        );
        return;
      }

      const rows = selectedDays.map((day) => ({
        professional_id: user.id,
        day_of_week: day.id,
        start_time: day.start,
        end_time: day.end,
        is_active: true,
      }));

      const { error: insertError } = await supabase
        .from("professional_availability")
        .insert(rows);

      if (insertError) {
        setError(
          `Não foi possível salvar sua disponibilidade: ${insertError.message}`,
        );
        return;
      }

      const { error: stepError } = await supabase
        .from("profiles")
        .update({ professional_onboarding_step: 8 })
        .eq("id", user.id);

      if (stepError) {
        setMessage(
          "Disponibilidade salva. Não foi possível atualizar o progresso do cadastro.",
        );
        return;
      }

      setMessage("Disponibilidade salva com sucesso.");

      window.setTimeout(() => {
        router.push("/cadastro-profissional/area-atendimento");
      }, 700);
    } catch {
      setError(
        "Ocorreu um erro inesperado ao salvar sua disponibilidade. Tente novamente.",
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

          <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between">
            <p className="text-sm font-medium text-orange-400">
              Etapa {CURRENT_STEP} de {TOTAL_STEPS}
            </p>

          </div>

          <div
            className="mx-auto mt-3 flex max-w-2xl gap-1.5"
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
                  index < CURRENT_STEP
                    ? "bg-orange-500"
                    : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            Sua disponibilidade
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Informe os dias e horários em que você normalmente está
            disponível para receber serviços pela VemGO.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm sm:p-7">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <p className="text-sm text-zinc-400">
                Carregando sua disponibilidade...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  Dias e horários de atendimento
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Marque os dias em que pode atender e defina o horário
                  inicial e final de cada um.
                </p>
              </div>

              <div className="space-y-3">
                {days.map((day) => (
                  <div
                    key={day.id}
                    className={`rounded-xl border p-4 transition ${
                      day.enabled
                        ? "border-orange-500/60 bg-orange-500/5"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={() => toggleDay(day.id)}
                          disabled={saving}
                          className="h-5 w-5 accent-orange-500"
                        />

                        <span className="font-semibold">
                          {day.name}
                        </span>
                      </label>

                      {day.enabled && (
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:max-w-[310px]">
                          <div className="min-w-0">
                            <label
                              htmlFor={`start-${day.id}`}
                              className="mb-1 block text-xs text-zinc-400"
                            >
                              Início
                            </label>

                            <input
                              id={`start-${day.id}`}
                              type="time"
                              value={day.start}
                              onChange={(event) =>
                                updateTime(
                                  day.id,
                                  "start",
                                  event.target.value,
                                )
                              }
                              disabled={saving}
                              required
                              className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2.5 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-60"
                            />
                          </div>

                          <span className="pb-3 text-xs text-zinc-500">
                            até
                          </span>

                          <div className="min-w-0">
                            <label
                              htmlFor={`end-${day.id}`}
                              className="mb-1 block text-xs text-zinc-400"
                            >
                              Fim
                            </label>

                            <input
                              id={`end-${day.id}`}
                              type="time"
                              value={day.end}
                              onChange={(event) =>
                                updateTime(
                                  day.id,
                                  "end",
                                  event.target.value,
                                )
                              }
                              disabled={saving}
                              required
                              className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2.5 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-60"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-4">
                <p className="text-sm font-semibold text-white">
                  Importante
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Informe horários em que realmente consegue atender.
                  Sua disponibilidade ajuda a VemGO a encaminhar
                  oportunidades compatíveis com sua agenda.
                </p>
              </div>

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

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/cadastro-profissional/precos")
                  }
                  disabled={saving}
                  className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar e continuar"}
                </button>
              </div>
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Você poderá atualizar sua disponibilidade posteriormente.
        </p>
      </div>
    </main>
  );
}
