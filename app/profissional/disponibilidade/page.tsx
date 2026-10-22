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

  const [availability, setAvailability] = useState<Availability[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState("1");

  const [startTime, setStartTime] = useState("08:00");

  const [endTime, setEndTime] = useState("18:00");

  const [name, setName] = useState("Profissional");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [avatarFailed, setAvatarFailed] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {

    let cancelled = false;

    async function loadAvailability() {

      const supabase = createSupabaseBrowserClient();

      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {

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

        setError("Não foi possível carregar seu perfil. Entre novamente.");

        setLoading(false);

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

      if (profile.user_type !== "professional") {

        router.replace("/login");

        return;

      }

      const firstName = profile.full_name?.trim().split(/\s+/)[0] || "Profissional";

      setName(firstName);

      // avatar_url pode ser uma URL completa ou o caminho de um arquivo privado.

      const storedAvatar =

        typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";

      if (storedAvatar) {

        if (/^https?:\/\//i.test(storedAvatar)) {

          setAvatarUrl(storedAvatar);

          setAvatarFailed(false);

        } else {

          const storagePath = storedAvatar

            .replace(/^profile-photos\//, "")

            .replace(/^\//, "");

          const { data: signedUrlData, error: signedUrlError } = await supabase.storage

            .from("profile-photos")

            .createSignedUrl(storagePath, 60 * 60);

          if (cancelled) return;

          if (!signedUrlError && signedUrlData?.signedUrl) {

            setAvatarUrl(signedUrlData.signedUrl);

            setAvatarFailed(false);

          } else {

            setAvatarUrl("");

            setAvatarFailed(true);

          }

        }

      } else {

        setAvatarUrl("");

        setAvatarFailed(true);

      }

      const { data, error: availabilityError } = await supabase

        .from("professional_availability")

        .select("id, day_of_week, start_time, end_time, is_active")

        .eq("professional_id", user.id)

        .eq("is_active", true)

        .order("day_of_week", { ascending: true })

        .order("start_time", { ascending: true });

      if (cancelled) return;

      if (availabilityError) {

        setError(`Não foi possível carregar sua disponibilidade: ${availabilityError.message}`);

        setLoading(false);

        return;

      }

      setAvailability(data || []);

      setLoading(false);

    }

    void loadAvailability();

    return () => {

      cancelled = true;

    };

  }, [router]);

  function getDayLabel(day: number) {

    return DAYS.find((item) => item.value === day)?.label || "Dia não identificado";

  }

  function handleAddAvailability() {

    setMessage("");

    setError("");

    if (!startTime || !endTime) {

      setError("Informe o horário inicial e final.");

      return;

    }

    if (startTime >= endTime) {

      setError("O horário inicial precisa ser anterior ao horário final.");

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

    ].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));

  }

  function handleRemoveAvailability(id: string) {

    setAvailability((current) => current.filter((item) => item.id !== id));

  }

  async function handleSave() {

    const supabase = createSupabaseBrowserClient();

    setMessage("");

    setError("");

    if (availability.length === 0) {

      setError("Cadastre pelo menos um horário de disponibilidade.");

      return;

    }

    setSaving(true);

    try {

      const {

        data: { user },

      } = await supabase.auth.getUser();

      if (!user) {

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

        setError(`Não foi possível atualizar a disponibilidade: ${deactivateError.message}`);

        return;

      }

      const rows = availability.map((item) => ({

        professional_id: user.id,

        day_of_week: item.day_of_week,

        start_time: item.start_time,

        end_time: item.end_time,

        is_active: true,

      }));

      const { data: insertedAvailability, error: insertError } = await supabase

        .from("professional_availability")

        .insert(rows)

        .select("id, day_of_week, start_time, end_time, is_active");

      if (insertError) {

        setError(`Não foi possível salvar a disponibilidade: ${insertError.message}`);

        return;

      }

      setAvailability(insertedAvailability || []);

      setMessage("Disponibilidade salva com sucesso.");

    } catch {

      setError("Ocorreu um erro inesperado ao salvar a disponibilidade. Tente novamente.");

    } finally {

      setSaving(false);

    }

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

          <p className="text-sm text-zinc-400">Carregando disponibilidade...</p>

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

              {avatarUrl && !avatarFailed ? (

                <Image

                  src={avatarUrl}

                  alt={`Foto de ${name}`}

                  width={56}

                  height={56}

                  className="h-full w-full object-cover"
            unoptimized

                  onError={() => {

                    setAvatarUrl("");

                    setAvatarFailed(true);

                  }}

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

            Disponibilidade

          </div>

          <h1 className="mt-4 text-3xl font-bold">Disponibilidade</h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">

            Informe os dias e horários em que você pode atender serviços pela VemGO.

          </p>

        </div>

        {error && (

          <div role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">

            {error}

          </div>

        )}

        {message && (

          <div role="status" className="mt-6 rounded-xl border border-orange-900 bg-orange-950/30 px-4 py-3 text-sm text-orange-300">

            {message}

          </div>

        )}

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6">

          <h2 className="text-xl font-semibold">Adicionar horário</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div>

              <label htmlFor="day-of-week" className="mb-2 block text-sm text-zinc-400">

                Dia da semana

              </label>

              <select

                id="day-of-week"

                value={dayOfWeek}

                onChange={(event) => setDayOfWeek(event.target.value)}

                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"

              >

                {DAYS.map((day) => (

                  <option key={day.value} value={day.value}>

                    {day.label}

                  </option>

                ))}

              </select>

            </div>

            <div>

              <label htmlFor="start-time" className="mb-2 block text-sm text-zinc-400">

                Início

              </label>

              <input

                id="start-time"

                type="time"

                value={startTime}

                onChange={(event) => setStartTime(event.target.value)}

                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"

              />

            </div>

            <div>

              <label htmlFor="end-time" className="mb-2 block text-sm text-zinc-400">

                Fim

              </label>

              <input

                id="end-time"

                type="time"

                value={endTime}

                onChange={(event) => setEndTime(event.target.value)}

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

        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">

          <div className="flex items-center justify-between gap-4">

            <h2 className="text-xl font-semibold">Minha disponibilidade</h2>

            <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300">

              {availability.length} horário(s)

            </span>

          </div>

          {availability.length === 0 ? (

            <p className="mt-6 text-sm text-zinc-500">Nenhum horário cadastrado.</p>

          ) : (

            <div className="mt-6 space-y-3">

              {availability.map((item) => (

                <div

                  key={item.id}

                  className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"

                >

                  <div>

                    <p className="font-semibold text-white">{getDayLabel(item.day_of_week)}</p>

                    <p className="mt-1 text-sm text-zinc-500">

                      {item.start_time.slice(0, 5)} às {item.end_time.slice(0, 5)}

                    </p>

                  </div>

                  <button

                    type="button"

                    onClick={() => handleRemoveAvailability(item.id)}

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

              onClick={() => void handleSave()}

              disabled={saving}

              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"

            >

              {saving ? "Salvando..." : "Salvar disponibilidade"}

            </button>

          </div>

        </section>

      </section>

    </main>

  );

}
