"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAYS = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export default function ProfissionalDisponibilidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [availability, setAvailability] = useState<Availability[]>(
    [],
  );

  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [name, setName] = useState("Profissional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAvailability() {
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

      const { data, error: availabilityError } =
        await supabase
          .from("professional_availability")
          .select(
            "id, day_of_week, start_time, end_time, is_active",
          )
          .eq("professional_id", user.id)
          .eq("is_active", true)
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true });

      if (availabilityError) {
        setError(
          `Não foi possível carregar sua disponibilidade: ${availabilityError.message}`,
        );
        setLoading(false);
        return;
      }

      setAvailability(data || []);
      setLoading(false);
    }

    void Promise.resolve().then(loadAvailability);
  }, [router, supabase]);

  function getDayLabel(day: number) {
    return (
      DAYS.find((item) => item.value === day)?.label ||
      "Dia não identificado"
    );
  }

  function handleAddAvailability() {
    setMessage("");
    setError("");

    if (!startTime || !endTime) {
      setError("Informe o horário inicial e final.");
      return;
    }

    if (startTime >= endTime) {
      setError(
        "O horário inicial precisa ser anterior ao horário final.",
      );
      return;
    }

    const selectedDay = Number(dayOfWeek);

    const alreadyExists = availability.some(
      (item) =>
        item.day_of_week === selectedDay &&
        item.start_time.slice(0, 5) === startTime &&
        item.end_time.slice(0, 5) === endTime,
    );

    if (alreadyExists) {
      setError("Esse horário já está cadastrado.");
      return;
    }

    setAvailability((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      },
    ]);
  }

  function handleRemoveAvailability(id: string) {
    setAvailability((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  async function handleSave() {
    setMessage("");
    setError("");

    if (availability.length === 0) {
      setError(
        "Cadastre pelo menos um horário de disponibilidade.",
      );
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
      .from("professional_availability")
      .update({ is_active: false })
      .eq("professional_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      setError(
        `Não foi possível atualizar a disponibilidade: ${deactivateError.message}`,
      );
      setSaving(false);
      return;
    }

    const rows = availability.map((item) => ({
      professional_id: user.id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      is_active: true,
    }));

    const {
      data: insertedAvailability,
      error: insertError,
    } = await supabase
      .from("professional_availability")
      .insert(rows)
      .select(
        "id, day_of_week, start_time, end_time, is_active",
      );

    if (insertError) {
      setError(
        `Não foi possível salvar a disponibilidade: ${insertError.message}`,
      );
      setSaving(false);
      return;
    }

    setAvailability(insertedAvailability || []);

    setMessage("Disponibilidade salva com sucesso.");

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
          Carregando disponibilidade...
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
                Disponibilidade
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
            Disponibilidade
          </h1>

          <p className="mt-2 max-w-3xl text-zinc-400">
            Informe os dias e horários em que você pode atender
            serviços pela VemGO.
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
            Adicionar horário
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Dia da semana
              </label>

              <select
                value={dayOfWeek}
                onChange={(event) =>
                  setDayOfWeek(event.target.value)
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              >
                {DAYS.map((day) => (
                  <option
                    key={day.value}
                    value={day.value}
                  >
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Início
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) =>
                  setStartTime(event.target.value)
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Fim
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(event.target.value)
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddAvailability}
            className="mt-5 rounded-xl border border-orange-600 px-5 py-3 font-semibold text-orange-400 transition hover:bg-orange-950/30"
          >
            + Adicionar horário
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Minha disponibilidade
            </h2>

            <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
              {availability.length} horário(s)
            </span>
          </div>

          {availability.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              Nenhum horário cadastrado.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {availability.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {getDayLabel(item.day_of_week)}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {item.start_time.slice(0, 5)} às{" "}
                      {item.end_time.slice(0, 5)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveAvailability(item.id)
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
              Você pode cadastrar mais de um intervalo por dia.
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : "Salvar disponibilidade"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}