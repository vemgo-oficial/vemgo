"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

type Appointment = {
  id: string;
  order_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

type Order = {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  price: number;
  currency: string;
  status: string;
};

type Service = {
  id: string;
  name: string;
  code: string;
};


function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number) {
  return Number(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function statusLabel(status: AppointmentStatus) {
  switch (status) {
    case "scheduled":
      return "Aguardando confirmação";

    case "confirmed":
      return "Confirmado";

    case "in_progress":
      return "Em andamento";

    case "completed":
      return "Concluído";

    case "cancelled":
      return "Cancelado";

    case "no_show":
      return "Não compareceu";

    default:
      return status;
  }
}

function statusClass(status: AppointmentStatus) {
  switch (status) {
    case "scheduled":
      return "border-orange-500/40 bg-orange-500/10 text-orange-400";

    case "confirmed":
      return "border-orange-500/40 bg-orange-500/10 text-orange-400";

    case "in_progress":
      return "border-orange-500/40 bg-orange-500/10 text-orange-400";

    case "completed":
      return "border-zinc-700 bg-zinc-900 text-zinc-300";

    case "cancelled":
      return "border-red-900 bg-red-950/30 text-red-400";

    case "no_show":
      return "border-zinc-700 bg-zinc-900 text-zinc-400";

    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function AppointmentCard({
  appointment,
  order,
  service,
  pending = false,
}: {
  appointment: Appointment;
  order: Order | undefined;
  service: Service | undefined;
  pending?: boolean;
}) {
  const router = useRouter();

  const title = service?.name || "Serviço VemGO";

  return (
    <button
      type="button"
      onClick={() =>
        router.push(`/profissional/agendamento/${appointment.order_id}`)
      }
      className={`w-full rounded-2xl border bg-black p-5 text-left transition ${
        pending
          ? "border-orange-500/60 hover:border-orange-400"
          : "border-zinc-800 hover:border-orange-600"
      }`}
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {pending && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-orange-400">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Nova solicitação
            </div>
          )}

          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Serviço
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {title}
          </h3>

          {service?.code && (
            <p className="mt-1 text-xs text-zinc-600">
              Código: {service.code}
            </p>
          )}

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Data
            </p>

            <p className="mt-1 font-medium text-zinc-200">
              {formatDate(appointment.starts_at)}
            </p>

            <p className="mt-1 text-lg font-bold text-orange-500">
              {formatTime(appointment.starts_at)} às{" "}
              {formatTime(appointment.ends_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
              appointment.status
            )}`}
          >
            {statusLabel(appointment.status)}
          </span>

          {order && (
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Valor
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {formatPrice(Number(order.price))}
              </p>
            </div>
          )}

          <span className="text-sm font-semibold text-orange-400">
            Ver detalhes →
          </span>
        </div>
      </div>

      {pending && (
        <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <p className="text-sm font-medium text-orange-300">
            O cliente solicitou este horário. Acesse para confirmar ou
            recusar.
          </p>
        </div>
      )}
    </button>
  );
}

export default function ProfessionalAppointmentsPage() {
  const router = useRouter();

  const [name, setName] = useState("Profissional");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setError(
          `Não foi possível carregar seu perfil: ${profileError.message}`
        );
        setLoading(false);
        return;
      }

      if (!profile || profile.user_type !== "professional") {
        router.replace("/cliente");
        return;
      }

      setName(profile.full_name || "Profissional");

      const { data: appointmentData, error: appointmentError } =
        await supabase
          .from("appointments")
          .select(
            "id, order_id, professional_id, starts_at, ends_at, status, confirmed_at, cancelled_at, cancellation_reason"
          )
          .eq("professional_id", user.id)
          .order("starts_at", { ascending: true });

      if (cancelled) return;

      if (appointmentError) {
        setError(
          `Não foi possível carregar os agendamentos: ${appointmentError.message}`
        );
        setLoading(false);
        return;
      }

      const appointmentRows = (appointmentData || []) as Appointment[];

      setAppointments(appointmentRows);

      const orderIds = [
        ...new Set(appointmentRows.map((appointment) => appointment.order_id)),
      ];

      if (orderIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, client_id, professional_id, service_id, price, currency, status"
        )
        .in("id", orderIds);

      if (cancelled) return;

      if (orderError) {
        setError(
          `Não foi possível carregar os pedidos: ${orderError.message}`
        );
        setLoading(false);
        return;
      }

      const orderRows = (orderData || []) as Order[];

      const orderMap: Record<string, Order> = {};

      for (const order of orderRows) {
        orderMap[order.id] = order;
      }

      setOrders(orderMap);

      const serviceIds = [
        ...new Set(orderRows.map((order) => order.service_id)),
      ];

      if (serviceIds.length > 0) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name, code")
          .in("id", serviceIds);

        if (cancelled) return;

        if (!serviceError) {
          const serviceRows = (serviceData || []) as Service[];

          const serviceMap: Record<string, Service> = {};

          for (const service of serviceRows) {
            serviceMap[service.id] = service;
          }

          setServices(serviceMap);
        }
      }

      setLoading(false);
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const pendingAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "scheduled"
      ),
    [appointments]
  );

  const confirmedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "confirmed"
      ),
    [appointments]
  );

  const otherAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status !== "scheduled" &&
          appointment.status !== "confirmed"
      ),
    [appointments]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-zinc-400">Carregando agendamentos...</p>
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
            onClick={() => router.push("/profissional")}
            className="flex items-center"
          >
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={190}
              height={64}
              priority
              unoptimized
            />
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-zinc-500">
                Área do profissional
              </div>

              <div className="text-sm text-zinc-300">
                Olá,{" "}
                <span className="font-semibold text-white">{name}</span>
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

        <div className="mt-8">
          <div className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-orange-400">
            AGENDA PROFISSIONAL
          </div>

          <h1 className="mt-4 text-3xl font-bold">Agendamento</h1>

          <p className="mt-2 text-zinc-400">
            Gerencie solicitações de horário e serviços agendados.
          </p>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {pendingAppointments.length > 0 && (
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-orange-400">
                🔔 Solicitações aguardando resposta
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Clientes escolheram estes horários e aguardam sua confirmação.
              </p>
            </div>

            <div className="grid gap-4">
              {pendingAppointments.map((appointment) => {
                const order = orders[appointment.order_id];
                const service = order
                  ? services[order.service_id]
                  : undefined;

                return (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    order={order}
                    service={service}
                    pending
                  />
                );
              })}
            </div>
          </section>
        )}

        {confirmedAppointments.length > 0 && (
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Agendamentos confirmados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Serviços que já possuem horário confirmado.
              </p>
            </div>

            <div className="grid gap-4">
              {confirmedAppointments.map((appointment) => {
                const order = orders[appointment.order_id];
                const service = order
                  ? services[order.service_id]
                  : undefined;

                return (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    order={order}
                    service={service}
                  />
                );
              })}
            </div>
          </section>
        )}

        {otherAppointments.length > 0 && (
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Histórico</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Agendamentos concluídos ou encerrados.
              </p>
            </div>

            <div className="grid gap-4">
              {otherAppointments.map((appointment) => {
                const order = orders[appointment.order_id];
                const service = order
                  ? services[order.service_id]
                  : undefined;

                return (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    order={order}
                    service={service}
                  />
                );
              })}
            </div>
          </section>
        )}

        {appointments.length === 0 && (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-black p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
              📅
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Nenhum agendamento
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Quando um cliente solicitar um horário, a solicitação aparecerá
              aqui.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}