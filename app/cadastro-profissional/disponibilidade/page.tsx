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

export default function CadastroProfissionalDisponibilidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [days, setDays] = useState<Day[]>(initialDays);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAvailability() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: availabilityError } = await supabase
        .from("professional_availability")
        .select("day_of_week,start_time,end_time,is_active")
        .eq("professional_id", user.id);

      if (availabilityError) {
        setError(
          `Não foi possível carregar sua disponibilidade: ${availabilityError.message}`,
        );
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setDays((current) =>
          current.map((day) => {
            const saved = data.find(
              (item) => item.day_of_week === day.id,
            );

            if (!saved) {
              return day;
            }

            return {
              ...day,
              enabled: saved.is_active,
              start: saved.start_time?.slice(0, 5) || day.start,
              end: saved.end_time?.slice(0, 5) || day.end,
            };
          }),
        );
      }

      setLoading(false);
    }

    void loadAvailability();
  }, [router, supabase]);

  function toggleDay(dayId: number) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
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
      setSaving(false);
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
      setSaving(false);
      return;
    }

    router.push("/cadastro-profissional/area-atendimento");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-2xl flex-col justify-center">
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
            Etapa 7 de 9
          </p>

          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 flex-1 rounded-full bg-orange-500"
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Sua disponibilidade
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Informe os dias e horários em que você normalmente
            está disponível para receber serviços pela VemGO.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Carregando sua disponibilidade...
            </div>
          ) : (
            <>
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
                          className="h-5 w-5 accent-orange-500"
                        />

                        <span className="font-semibold">
                          {day.name}
                        </span>
                      </label>

                      {day.enabled && (
                        <div className="flex items-center gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-zinc-500">
                              Início
                            </label>

                            <input
                              type="time"
                              value={day.start}
                              onChange={(event) =>
                                updateTime(
                                  day.id,
                                  "start",
                                  event.target.value,
                                )
                              }
                              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
                            />
                          </div>

                          <span className="mt-5 text-zinc-600">
                            até
                          </span>

                          <div>
                            <label className="mb-1 block text-xs text-zinc-500">
                              Fim
                            </label>

                            <input
                              type="time"
                              value={day.end}
                              onChange={(event) =>
                                updateTime(
                                  day.id,
                                  "end",
                                  event.target.value,
                                )
                              }
                              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  {error}
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
          A disponibilidade informa quando você normalmente
          pode atender. Cada serviço ainda dependerá da sua
          confirmação.
        </p>
      </div>
    </main>
  );
}