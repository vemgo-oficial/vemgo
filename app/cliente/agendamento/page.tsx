"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type OrderInfo = {
  id: string;
  request_id: string | null;
  client_id: string;
  professional_id: string;
  service_id: string;
  status: string;
  price: number;
};

type ServiceInfo = { name: string; code: string };
type ProfessionalInfo = { display_name: string | null };
type Availability = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};
type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

const SLOT_MINUTES = 60;
const DAYS_AHEAD = 21;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function combineLocalDateTime(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(year, month - 1, day, 12));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function ClienteAgendamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [professional, setProfessional] = useState<ProfessionalInfo | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canRetryLoad, setCanRetryLoad] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setCanRetryLoad(false);
    setOrder(null);
    setService(null);
    setProfessional(null);
    setAvailability([]);
    setAppointments([]);

    try {
      if (!orderId) {
        setError("Pedido não informado. Abra o agendamento a partir de Meus serviços.");
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace(`/login?redirect=/cliente/agendamento?orderId=${orderId}`);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, request_id, client_id, professional_id, service_id, status, price")
        .eq("id", orderId)
        .eq("client_id", user.id)
        .maybeSingle();

      if (orderError || !orderData) {
        setError(orderError
          ? "Não foi possível consultar este pedido. Tente novamente."
          : "Não foi possível localizar este pedido para sua conta.");
        setCanRetryLoad(Boolean(orderError));
        return;
      }

      if (!orderData.professional_id) {
        setError("Este pedido ainda não tem um profissional selecionado.");
        return;
      }

      const [
        { data: serviceData, error: serviceError },
        { data: professionalData, error: professionalError },
        { data: availabilityData, error: availabilityError },
        { data: appointmentData, error: appointmentError },
      ] = await Promise.all([
        supabase.from("services").select("name, code").eq("id", orderData.service_id).maybeSingle(),
        supabase.from("professionals").select("display_name").eq("id", orderData.professional_id).maybeSingle(),
        supabase.from("professional_availability")
          .select("day_of_week, start_time, end_time")
          .eq("professional_id", orderData.professional_id)
          .eq("is_active", true)
          .order("day_of_week")
          .order("start_time"),
        supabase.from("appointments")
          .select("id, starts_at, ends_at, status")
          .eq("professional_id", orderData.professional_id)
          .in("status", ["scheduled", "confirmed", "in_progress"]),
      ]);

      if (serviceError || professionalError || availabilityError || appointmentError) {
        setError("Não foi possível carregar os horários. Tente novamente.");
        setCanRetryLoad(true);
        return;
      }

      setOrder(orderData as OrderInfo);
      setService(serviceData as ServiceInfo | null);
      setProfessional(professionalData as ProfessionalInfo | null);
      setAvailability((availabilityData ?? []) as Availability[]);
      setAppointments((appointmentData ?? []) as Appointment[]);
    } catch {
      setError("Não foi possível carregar os dados do agendamento. Tente novamente.");
      setCanRetryLoad(true);
    } finally {
      setLoading(false);
    }
  }, [orderId, router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dates = useMemo(() => {
    const result: { key: string; label: string; day: number }[] = [];
    const now = new Date();
    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const key = localDateKey(date);
      if (availability.some((a) => a.day_of_week === date.getDay())) {
        result.push({ key, label: formatDate(key), day: date.getDay() });
      }
    }
    return result;
  }, [availability]);

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    const [year, month, day] = selectedDate.split("-").map(Number);
    const weekday = new Date(year, month - 1, day, 12).getDay();
    const today = new Date();
    const result: { start: Date; end: Date; key: string }[] = [];

    for (const window of availability.filter((a) => a.day_of_week === weekday)) {
      const startText = window.start_time.slice(0, 5);
      const endText = window.end_time.slice(0, 5);
      let cursor = combineLocalDateTime(selectedDate, startText);
      const windowEnd = combineLocalDateTime(selectedDate, endText);

      while (addMinutes(cursor, SLOT_MINUTES) <= windowEnd) {
        const end = addMinutes(cursor, SLOT_MINUTES);
        const isFuture = cursor.getTime() > today.getTime();
        const collides = appointments.some((appointment) => {
          const existingStart = new Date(appointment.starts_at).getTime();
          const existingEnd = new Date(appointment.ends_at).getTime();
          return cursor.getTime() < existingEnd && end.getTime() > existingStart;
        });

        if (isFuture && !collides) {
          result.push({ start: new Date(cursor), end, key: cursor.toISOString() });
        }
        cursor = end;
      }
    }

    return result;
  }, [selectedDate, availability, appointments]);

  async function confirmAppointment() {
    if (!order || !selectedStart) {
      setError("Selecione uma data e um horário.");
      return;
    }

    const chosen = slots.find((slot) => slot.key === selectedStart);
    if (!chosen) {
      setError("Esse horário não está mais disponível. Atualize os horários e escolha outro.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const startIso = chosen.start.toISOString();
    const endIso = chosen.end.toISOString();

    // A RPC valida o pedido, o profissional e a disponibilidade no servidor.
    try {
      const { error: bookingError } = await supabase.rpc("request_appointment_slot", {
        p_order_id: order.id,
        p_starts_at: startIso,
        p_ends_at: endIso,
      });

      if (bookingError) {
        setError(bookingError.message || "Não foi possível solicitar esse horário. Atualize e tente novamente.");
        return;
      }

      setSuccess("Horário solicitado com sucesso.");
      await load();
      router.push(`/cliente/agendamento/${order.id}`);
    } catch {
      setError("Não foi possível solicitar esse horário. Atualize e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Carregando horários disponíveis...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <button type="button" onClick={() => router.push("/cliente/servicos")} className="rounded-lg text-sm font-semibold text-zinc-400 transition hover:text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
          ← Meus serviços
        </button>
      </div>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          AGENDAMENTO
        </span>
        <h1 className="mt-4 text-3xl font-bold">Escolha data e horário</h1>
        <p className="mt-2 text-zinc-400">Selecione um horário disponível na agenda do profissional.</p>

        {error && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><span>{error}</span>{canRetryLoad && <button type="button" onClick={() => void load()} className="rounded-lg border border-red-400/30 px-3 py-2 font-semibold text-red-200 transition hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Tentar novamente</button>}</div>}
        {success && <div role="status" className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">{success}</div>}

        {order && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Serviço</p>
            <h2 className="mt-2 text-xl font-semibold">{service?.name ?? "Serviço VemGO"}</h2>
            <p className="mt-1 text-sm text-zinc-500">{service?.code ?? ""}</p>
            <p className="mt-4 text-sm text-zinc-300">Profissional: <strong>{professional?.display_name?.trim() || "Profissional VemGO"}</strong></p>
          </div>
        )}

        {order && availability.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-sm text-yellow-200">
            Este profissional ainda não cadastrou horários disponíveis. Entre em contato com o profissional ou tente novamente mais tarde.
          </div>
        ) : order && availability.length > 0 ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-2xl border border-zinc-800 p-5">
              <h2 className="text-lg font-semibold">1. Escolha o dia</h2>
              <div className="mt-4 grid gap-2">
                {dates.map((date) => (
                  <button key={date.key} onClick={() => { setSelectedDate(date.key); setSelectedStart(""); }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm capitalize transition ${selectedDate === date.key ? "border-green-500 bg-green-500/10 text-green-300" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
                    {date.label}
                  </button>
                ))}
                {dates.length === 0 && <p className="text-sm text-zinc-500">Não há dias disponíveis nos próximos {DAYS_AHEAD} dias.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 p-5">
              <h2 className="text-lg font-semibold">2. Escolha o horário</h2>
              {!selectedDate ? (
                <p className="mt-4 text-sm text-zinc-500">Escolha um dia para visualizar os horários.</p>
              ) : slots.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">Não há horários livres neste dia. Escolha outra data.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <button key={slot.key} onClick={() => setSelectedStart(slot.key)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${selectedStart === slot.key ? "border-green-500 bg-green-500 text-black" : "border-zinc-700 text-zinc-200 hover:border-green-500"}`}>
                      {formatTime(slot.start)}–{formatTime(slot.end)}
                    </button>
                  ))}
                </div>
              )}
              <button disabled={!selectedStart || saving} onClick={() => void confirmAppointment()}
                className="mt-6 w-full rounded-xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40">
                {saving ? "Confirmando horário..." : "Confirmar agendamento"}
              </button>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function ClienteAgendamentoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm text-zinc-400">Carregando agendamento...</p>
        </main>
      }
    >
      <ClienteAgendamentoContent />
    </Suspense>
  );
}
