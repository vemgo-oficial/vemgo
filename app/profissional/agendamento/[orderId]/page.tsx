"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Order = {
  id: string;
  status: string;
  price: number;
  professional_id: string;
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

type Profile = {
  full_name: string | null;
  user_type: string;
  status: string;
};

type SupabaseError = {
  message?: string;
};

const supabase = createSupabaseBrowserClient();

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as SupabaseError).message;

    if (
      typeof message === "string" &&
      message.length > 0
    ) {
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

function formatDateTime(
  dateString: string
) {
  return new Date(dateString).toLocaleString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default function ProfessionalAppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderId =
    typeof params.orderId === "string"
      ? params.orderId
      : Array.isArray(params.orderId)
      ? params.orderId[0]
      : "";

  const [name, setName] =
    useState("Profissional");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [appointment, setAppointment] =
    useState<Appointment | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [finished, setFinished] =
    useState(false);

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name,user_type,status"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const typedProfile =
        profile as Profile | null;

      if (!typedProfile) {
        router.replace("/login");
        return;
      }

      if (
        typedProfile.status === "blocked"
      ) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (
        typedProfile.user_type !==
        "professional"
      ) {
        if (
          typedProfile.user_type ===
          "client"
        ) {
          router.replace("/cliente");
        } else if (
          typedProfile.user_type ===
          "admin"
        ) {
          router.replace("/controle");
        } else if (
          typedProfile.user_type ===
          "company"
        ) {
          router.replace("/empresa");
        } else {
          router.replace("/login");
        }

        return;
      }

      setName(
        typedProfile.full_name ||
          "Profissional"
      );

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .select(
          "id,status,price,professional_id"
        )
        .eq("id", orderId)
        .eq(
          "professional_id",
          user.id
        )
        .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      if (!orderData) {
        setError(
          "Pedido não encontrado para este profissional."
        );
        return;
      }

      const typedOrder =
        orderData as Order;

      setOrder(typedOrder);

      const {
        data: appointmentData,
        error: appointmentError,
      } = await supabase
        .from("appointments")
        .select(
          `
            id,
            order_id,
            professional_id,
            starts_at,
            ends_at,
            status,
            confirmed_at,
            cancelled_at,
            cancellation_reason
          `
        )
        .eq(
          "order_id",
          orderId
        )
        .eq(
          "professional_id",
          user.id
        )
        .in("status", [
          "scheduled",
          "confirmed",
          "in_progress",
        ])
        .order(
          "starts_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (appointmentError) {
        throw appointmentError;
      }

      setAppointment(
        appointmentData as Appointment | null
      );
    } catch (err: unknown) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Não foi possível carregar a solicitação."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(
    decision: "confirmed" | "declined"
  ) {
    if (
      !appointment ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "respond_to_appointment_request",
        {
          p_appointment_id:
            appointment.id,
          p_decision: decision,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const updatedAppointment =
        data as Appointment;

      setAppointment(
        updatedAppointment
      );

      if (
        decision === "confirmed"
      ) {
        setMessage(
          "Horário confirmado com sucesso. O cliente será informado da confirmação."
        );
      } else {
        setMessage(
          "Horário recusado. O cliente poderá escolher outro horário."
        );
      }

      setFinished(true);

      setTimeout(() => {
        router.push(
          "/profissional/agendamento"
        );
      }, 1200);
    } catch (err: unknown) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Não foi possível processar esta solicitação."
        )
      );

      setProcessing(false);
    }
  }

  useEffect(() => {
    if (!orderId) {
      setError(
        "Pedido inválido."
      );
      setLoading(false);
      return;
    }

    void loadPage();
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-zinc-400">
            Carregando solicitação...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0C0A09] text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/profissional/agendamento"
              )
            }
            className="flex items-center"
          >
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={160}
              height={54}
              priority
            />
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/profissional/agendamento"
              )
            }
            className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold text-white transition hover:border-orange-500 hover:text-orange-400"
          >
            ← Voltar
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-orange-500">
            AGENDAMENTO PROFISSIONAL
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Solicitação de horário
          </h1>

          <p className="mt-2 text-zinc-400">
            Analise o horário escolhido pelo
            cliente e confirme ou recuse.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {message && (
          <div
            className={[
              "mb-6 rounded-2xl p-5",
              finished
                ? "border border-orange-800 bg-orange-950/30"
                : "border border-zinc-800 bg-black",
            ].join(" ")}
          >
            <p
              className={
                finished
                  ? "text-sm text-orange-300"
                  : "text-sm text-zinc-300"
              }
            >
              {message}
            </p>
          </div>
        )}

        {order && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-black p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Pedido
                </p>

                <p className="mt-1 break-all text-sm text-zinc-200">
                  {order.id}
                </p>

                <span className="mt-4 inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-400">
                  Serviço confirmado
                </span>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Valor
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-500">
                  {formatCurrency(
                    Number(order.price)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {!appointment ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">
                STATUS
              </p>

              <p className="mt-2 text-xl font-semibold text-zinc-300">
                Nenhuma solicitação de horário
                pendente.
              </p>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Quando um cliente escolher um
                horário para este serviço, a
                solicitação aparecerá aqui.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profissional/agendamento"
                )
              }
              className="mt-6 w-full rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400"
            >
              Voltar para agendamentos
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-black p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  STATUS
                </p>

                <p
                  className={[
                    "mt-1 text-xl font-semibold",
                    appointment.status ===
                    "confirmed"
                      ? "text-orange-400"
                      : appointment.status ===
                        "scheduled"
                      ? "text-orange-400"
                      : "text-zinc-400",
                  ].join(" ")}
                >
                  {appointment.status ===
                  "scheduled"
                    ? "Aguardando sua confirmação"
                    : appointment.status ===
                      "confirmed"
                    ? "Agendamento confirmado"
                    : "Solicitação encerrada"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                HORÁRIO SOLICITADO PELO CLIENTE
              </p>

              <p className="mt-3 text-xl font-semibold capitalize text-white">
                {formatDateTime(
                  appointment.starts_at
                )}
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                {formatTime(
                  appointment.starts_at
                )}{" "}
                às{" "}
                {formatTime(
                  appointment.ends_at
                )}
              </p>
            </div>

            {appointment.status ===
              "scheduled" &&
              !finished && (
                <>
                  <div className="mt-5 rounded-2xl border border-orange-900 bg-orange-950/20 p-5">
                    <p className="text-sm leading-6 text-orange-300">
                      Verifique se você realmente
                      poderá atender neste horário
                      antes de confirmar.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        handleDecision(
                          "declined"
                        )
                      }
                      className="rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-white transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing
                        ? "Processando..."
                        : "Recusar horário"}
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        handleDecision(
                          "confirmed"
                        )
                      }
                      className="rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing
                        ? "Processando..."
                        : "Confirmar horário"}
                    </button>
                  </div>
                </>
              )}

            {appointment.status ===
              "confirmed" && (
              <div className="mt-6 rounded-2xl border border-orange-800 bg-orange-950/20 p-5">
                <p className="font-semibold text-orange-400">
                  Agendamento confirmado
                </p>

                <p className="mt-2 text-sm leading-6 text-orange-200/80">
                  O cliente recebeu a confirmação
                  deste horário.
                </p>
              </div>
            )}

            {finished && (
              <div className="mt-6 rounded-2xl border border-orange-800 bg-orange-950/20 p-5">
                <p className="font-semibold text-orange-400">
                  {appointment.status ===
                  "confirmed"
                    ? "Horário confirmado."
                    : "Horário recusado."}
                </p>

                <p className="mt-2 text-sm text-orange-200/80">
                  Voltando para seus agendamentos...
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600">
            Profissional: {name}
          </p>
        </div>
      </section>
    </main>
  );
}