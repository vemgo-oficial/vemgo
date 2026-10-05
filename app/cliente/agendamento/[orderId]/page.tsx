"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Order = {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  address_id: string;
  price: number;
  currency: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

type Appointment = {
  id: string;
  order_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status:
    | "scheduled"
    | "confirmed"
    | "cancelled"
    | "in_progress"
    | "completed"
    | "no_show";
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type ScheduleData = {
  order_id: string;
  professional_id: string;
  availability: Availability[];
  appointments: Appointment[];
};

type SupabaseError = {
  message?: string;
};

const supabase = createSupabaseBrowserClient();

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as SupabaseError).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createLocalDate(dateKey: string, hour: number) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function getDayOfWeek(date: Date) {
  return date.getDay();
}

function isSameHour(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate() &&
    dateA.getHours() === dateB.getHours()
  );
}

export default function ClienteAgendamentoPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.orderId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [order, setOrder] = useState<Order | null>(null);
  const [appointment, setAppointment] =
    useState<Appointment | null>(null);
  const [schedule, setSchedule] =
    useState<ScheduleData | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<Date | null>(null);
  const [selectedTime, setSelectedTime] =
    useState<Date | null>(null);

  const [isRescheduling, setIsRescheduling] =
    useState(false);

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);

      date.setDate(today.getDate() + i);

      days.push(date);
    }

    return days;
  }, [today]);

  function hasAvailableSlot(
    date: Date,
    scheduleData: ScheduleData | null
  ) {
    if (!scheduleData) {
      return false;
    }

    const dayOfWeek = getDayOfWeek(date);

    const availability =
      scheduleData.availability.filter(
        (item) =>
          item.is_active &&
          item.day_of_week === dayOfWeek
      );

    if (availability.length === 0) {
      return false;
    }

    const appointments =
      scheduleData.appointments || [];

    for (const window of availability) {
      const startMinutes = timeToMinutes(
        window.start_time
      );

      const endMinutes = timeToMinutes(
        window.end_time
      );

      for (
        let minutes = startMinutes;
        minutes + 60 <= endMinutes;
        minutes += 60
      ) {
        const hour = Math.floor(minutes / 60);

        const slotStart = createLocalDate(
          getLocalDateKey(date),
          hour
        );

        const slotEnd = new Date(slotStart);

        slotEnd.setHours(
          slotStart.getHours() + 1
        );

        const occupied = appointments.some((item) => {
          if (
            ![
              "scheduled",
              "confirmed",
              "in_progress",
            ].includes(item.status)
          ) {
            return false;
          }

          const appointmentStart =
            new Date(item.starts_at);

          const appointmentEnd =
            new Date(item.ends_at);

          return (
            appointmentStart < slotEnd &&
            appointmentEnd > slotStart
          );
        });

        if (!occupied) {
          return true;
        }
      }
    }

    return false;
  }

  function getAvailableTimes(date: Date) {
    if (!schedule) {
      return [];
    }

    const dayOfWeek = getDayOfWeek(date);

    const availability =
      schedule.availability.filter(
        (item) =>
          item.is_active &&
          item.day_of_week === dayOfWeek
      );

    const appointments =
      schedule.appointments || [];

    const times: Date[] = [];

    for (const window of availability) {
      const startMinutes = timeToMinutes(
        window.start_time
      );

      const endMinutes = timeToMinutes(
        window.end_time
      );

      for (
        let minutes = startMinutes;
        minutes + 60 <= endMinutes;
        minutes += 60
      ) {
        const hour = Math.floor(minutes / 60);

        const slotStart = createLocalDate(
          getLocalDateKey(date),
          hour
        );

        const slotEnd = new Date(slotStart);

        slotEnd.setHours(
          slotStart.getHours() + 1
        );

        const occupied = appointments.some((item) => {
          if (
            ![
              "scheduled",
              "confirmed",
              "in_progress",
            ].includes(item.status)
          ) {
            return false;
          }

          const appointmentStart =
            new Date(item.starts_at);

          const appointmentEnd =
            new Date(item.ends_at);

          return (
            appointmentStart < slotEnd &&
            appointmentEnd > slotStart
          );
        });

        if (!occupied) {
          times.push(slotStart);
        }
      }
    }

    return times;
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id,user_type,status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (profile?.user_type !== "client") {
        router.replace("/login");
        return;
      }

      const { data: orderData, error: orderError } =
        await supabase
          .from("orders")
          .select(
            `
              id,
              client_id,
              professional_id,
              service_id,
              address_id,
              price,
              currency,
              status,
              scheduled_start,
              scheduled_end
            `
          )
          .eq("id", orderId)
          .eq("client_id", user.id)
          .single();

      if (orderError) {
        throw orderError;
      }

      setOrder(orderData);

      const {
        data: scheduleData,
        error: scheduleError,
      } = await supabase.rpc(
        "get_client_order_schedule",
        {
          p_order_id: orderId,
        }
      );

      if (scheduleError) {
        throw scheduleError;
      }

      const normalizedSchedule =
        scheduleData as ScheduleData;

      setSchedule(normalizedSchedule);

      const appointments = [
        ...(normalizedSchedule.appointments || []),
      ].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() -
          new Date(b.starts_at).getTime()
      );

      const currentAppointment =
        appointments.find(
          (item) =>
            item.order_id === orderId &&
            [
              "scheduled",
              "confirmed",
              "in_progress",
            ].includes(item.status)
        );

      setAppointment(
        currentAppointment || null
      );

      if (!currentAppointment) {
        const firstAvailable =
          calendarDays.find((date) =>
            hasAvailableSlot(
              date,
              normalizedSchedule
            )
          );

        if (firstAvailable) {
          setSelectedDate(firstAvailable);
        }
      }
    } catch (err: unknown) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Não foi possível carregar o agendamento."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestTime() {
    if (
      !selectedDate ||
      !selectedTime ||
      !order
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const start = new Date(selectedTime);

      const end = new Date(start);

      end.setHours(
        end.getHours() + 1
      );

      let data;
      let rpcError;

      if (isRescheduling) {
        const response = await supabase.rpc(
          "reschedule_appointment_slot",
          {
            p_order_id: order.id,
            p_starts_at: start.toISOString(),
            p_ends_at: end.toISOString(),
          }
        );

        data = response.data;
        rpcError = response.error;
      } else {
        const response = await supabase.rpc(
          "request_appointment_slot",
          {
            p_order_id: order.id,
            p_starts_at: start.toISOString(),
            p_ends_at: end.toISOString(),
          }
        );

        data = response.data;
        rpcError = response.error;
      }

      if (rpcError) {
        throw rpcError;
      }

      setAppointment(data as Appointment);

      setMessage(
        isRescheduling
          ? `Novo horário solicitado: ${formatDate(
              start
            )} às ${formatTime(start)}.`
          : `Solicitação enviada para ${formatDate(
              start
            )} às ${formatTime(start)}.`
      );

      setTimeout(() => {
        router.push("/cliente/servicos");
      }, 900);
    } catch (err: unknown) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Não foi possível solicitar este horário."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function startRescheduling() {
    setError("");
    setMessage("");
    setSelectedTime(null);
    setIsRescheduling(true);

    const firstAvailable =
      calendarDays.find((date) =>
        hasAvailableSlot(date, schedule)
      );

    if (firstAvailable) {
      setSelectedDate(firstAvailable);
    }
  }

  function cancelRescheduling() {
    setIsRescheduling(false);
    setSelectedTime(null);
    setError("");
    setMessage("");
  }

  /*
   * O carregamento da página é uma sincronização com
   * Supabase/Auth e precisa atualizar estados locais.
   * Mantemos o efeito isolado e controlado pelo orderId.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!orderId) {
      return;
    }

    void loadPage();
  }, [orderId]);
  /* eslint-enable react-hooks/exhaustive-deps */
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-400">
          Carregando agendamento...
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="mb-5 text-red-400">
            {error ||
              "Serviço não encontrado."}
          </p>

          <button
            onClick={() =>
              router.push("/cliente/servicos")
            }
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Voltar para meus serviços
          </button>
        </div>
      </main>
    );
  }

  const appointmentStart =
    appointment
      ? new Date(appointment.starts_at)
      : null;

  const appointmentEnd =
    appointment
      ? new Date(appointment.ends_at)
      : null;

  const availableTimes =
    selectedDate
      ? getAvailableTimes(selectedDate)
      : [];

  const showPending =
    appointment?.status === "scheduled" &&
    !isRescheduling;

  const showConfirmed =
    appointment?.status === "confirmed" &&
    !isRescheduling;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() =>
              router.push("/cliente/servicos")
            }
            className="flex items-center"
          >
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={130}
              height={42}
              priority
            />
          </button>

          <button
            onClick={() =>
              router.push("/cliente/servicos")
            }
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Meus serviços
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
            VemGO • Agendamento
          </p>

          <h1 className="text-3xl font-bold">
            {showConfirmed
              ? "Serviço agendado"
              : showPending
              ? "Aguardando confirmação"
              : isRescheduling
              ? "Reagendar serviço"
              : "Escolha quando você pode receber o serviço"}
          </h1>

          <p className="mt-2 text-zinc-400">
            Valor do serviço:{" "}
            <span className="font-semibold text-white">
              {formatCurrency(
                Number(order.price)
              )}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950/40 px-5 py-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {showPending &&
          appointmentStart &&
          appointmentEnd && (
            <div className="rounded-2xl border border-yellow-800 bg-zinc-950 p-7">
              <div className="mb-6">
                <span className="inline-flex rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                  AGUARDANDO CONFIRMAÇÃO
                </span>
              </div>

              <h2 className="text-2xl font-bold">
                Horário solicitado
              </h2>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">
                  Data
                </p>

                <p className="mt-1 text-lg font-semibold capitalize">
                  {formatDate(
                    appointmentStart
                  )}
                </p>

                <p className="mt-4 text-sm text-zinc-500">
                  Horário
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatTime(
                    appointmentStart
                  )}{" "}
                  às{" "}
                  {formatTime(
                    appointmentEnd
                  )}
                </p>
              </div>

              <p className="mt-5 text-sm leading-6 text-zinc-400">
                O profissional ainda precisa
                confirmar ou recusar este horário.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/cliente/servicos"
                  )
                }
                className="mt-7 w-full rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-900"
              >
                Voltar para meus serviços
              </button>
            </div>
          )}

        {showConfirmed &&
          appointmentStart &&
          appointmentEnd && (
            <div className="rounded-2xl border border-emerald-800 bg-zinc-950 p-7">
              <div className="mb-6">
                <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  AGENDADO
                </span>
              </div>

              <h2 className="text-2xl font-bold">
                Seu serviço está agendado
              </h2>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">
                  Data
                </p>

                <p className="mt-1 text-lg font-semibold capitalize">
                  {formatDate(
                    appointmentStart
                  )}
                </p>

                <p className="mt-4 text-sm text-zinc-500">
                  Horário
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatTime(
                    appointmentStart
                  )}{" "}
                  às{" "}
                  {formatTime(
                    appointmentEnd
                  )}
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() =>
                    router.push(
                      "/cliente/servicos"
                    )
                  }
                  className="flex-1 rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-900"
                >
                  Voltar para meus serviços
                </button>

                <button
                  onClick={startRescheduling}
                  className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-black transition hover:bg-emerald-400"
                >
                  Reagendar
                </button>
              </div>
            </div>
          )}

        {(!appointment ||
          isRescheduling) && (
          <div>
            {isRescheduling && (
              <div className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950/30 px-5 py-4">
                <p className="font-semibold text-emerald-400">
                  Reagendamento
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  Escolha um novo horário. O horário
                  atual será substituído e o novo
                  horário precisará ser confirmado
                  pelo profissional.
                </p>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h2 className="text-lg font-bold">
                  Escolha a data
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {calendarDays.map(
                    (date) => {
                      const available =
                        hasAvailableSlot(
                          date,
                          schedule
                        );

                      const selected =
                        selectedDate &&
                        getLocalDateKey(
                          selectedDate
                        ) ===
                          getLocalDateKey(
                            date
                          );

                      return (
                        <button
                          key={getLocalDateKey(
                            date
                          )}
                          disabled={
                            !available
                          }
                          onClick={() => {
                            setSelectedDate(
                              date
                            );
                            setSelectedTime(
                              null
                            );
                            setError("");
                          }}
                          className={[
                            "rounded-xl border px-3 py-4 text-center transition",
                            selected
                              ? "border-emerald-400 bg-emerald-500 text-black"
                              : available
                              ? "border-zinc-700 bg-black text-white hover:border-emerald-500"
                              : "cursor-not-allowed border-zinc-900 bg-zinc-900 text-zinc-700",
                          ].join(" ")}
                        >
                          <div className="text-xs uppercase">
                            {date.toLocaleDateString(
                              "pt-BR",
                              {
                                weekday:
                                  "short",
                              }
                            )}
                          </div>

                          <div className="mt-1 text-lg font-bold">
                            {date.getDate()}
                          </div>

                          <div className="text-xs">
                            {date.toLocaleDateString(
                              "pt-BR",
                              {
                                month:
                                  "short",
                              }
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h2 className="text-lg font-bold">
                  {selectedDate
                    ? `Horários — ${formatDateShort(
                        selectedDate
                      )}`
                    : "Escolha uma data"}
                </h2>

                {selectedDate && (
                  <div className="mt-5 space-y-3">
                    {availableTimes.length ===
                    0 ? (
                      <p className="text-sm text-zinc-500">
                        Não há horários disponíveis
                        nesta data.
                      </p>
                    ) : (
                      availableTimes.map(
                        (time) => {
                          const selected =
                            selectedTime &&
                            isSameHour(
                              selectedTime,
                              time
                            );

                          return (
                            <button
                              key={time.toISOString()}
                              onClick={() => {
                                setSelectedTime(
                                  time
                                );
                                setError("");
                              }}
                              className={[
                                "w-full rounded-xl border px-4 py-3 text-left font-semibold transition",
                                selected
                                  ? "border-emerald-400 bg-emerald-500 text-black"
                                  : "border-zinc-700 bg-black text-white hover:border-emerald-500",
                              ].join(" ")}
                            >
                              {formatTime(
                                time
                              )}{" "}
                              —{" "}
                              {formatTime(
                                new Date(
                                  time.getTime() +
                                    60 *
                                      60 *
                                      1000
                                )
                              )}
                            </button>
                          );
                        }
                      )
                    )}
                  </div>
                )}

                <button
                  disabled={
                    !selectedTime ||
                    saving
                  }
                  onClick={
                    handleRequestTime
                  }
                  className="mt-7 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Enviando..."
                    : isRescheduling
                    ? "Solicitar novo horário"
                    : "Solicitar este horário"}
                </button>

                {isRescheduling && (
                  <button
                    onClick={
                      cancelRescheduling
                    }
                    className="mt-3 w-full rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:bg-zinc-900"
                  >
                    Cancelar reagendamento
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-400">
              <strong className="text-white">
                Importante:
              </strong>{" "}
              o horário escolhido é uma
              solicitação. O serviço só fica
              definitivamente agendado depois que
              o profissional confirmar.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}