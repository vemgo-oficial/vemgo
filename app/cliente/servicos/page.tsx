"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Order = {
  id: string;
  service_id: string;
  address_id: string;
  price: number;
  currency: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
};

type Service = {
  id: string;
  code: string;
  name: string;
};

type Address = {
  id: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
};

type Appointment = {
  id: string;
  order_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

type DisplayOrder = {
  order: Order;
  service?: Service;
  address?: Address;
  appointment?: Appointment;
};

type Filter =
  | "all"
  | "pending"
  | "waiting_schedule"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDisplayStatus(item: DisplayOrder) {
  const { order, appointment } = item;

  if (
    order.status === "cancelled" ||
    appointment?.status === "cancelled"
  ) {
    return {
      key: "cancelled" as Filter,
      label: "Cancelado",
      description: "Este serviço foi cancelado.",
      className:
        "border-red-500/40 bg-red-500/10 text-red-400",
    };
  }

  if (
    order.status === "completed" ||
    appointment?.status === "completed"
  ) {
    return {
      key: "completed" as Filter,
      label: "Concluído",
      description: order.scheduled_end
        ? `Serviço realizado em ${formatDate(order.scheduled_end)}`
        : "Serviço realizado.",
      className:
        "border-green-500/40 bg-green-500/10 text-green-400",
    };
  }

  if (
    order.status === "in_progress" ||
    appointment?.status === "in_progress"
  ) {
    return {
      key: "in_progress" as Filter,
      label: "Em andamento",
      description: "O serviço está em execução.",
      className:
        "border-blue-500/40 bg-blue-500/10 text-blue-400",
    };
  }

  if (appointment?.status === "confirmed") {
    return {
      key: "scheduled" as Filter,
      label: "Agendado",
      description: `${formatDate(appointment.starts_at)} às ${formatTime(
        appointment.starts_at
      )}`,
      className:
        "border-blue-500/40 bg-blue-500/10 text-blue-400",
    };
  }

  if (appointment?.status === "scheduled") {
    return {
      key: "waiting_schedule" as Filter,
      label: "Aguardando confirmação",
      description: `Horário solicitado em ${formatDateTime(
        appointment.starts_at
      )}`,
      className:
        "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    };
  }

  if (
    order.status === "confirmed" ||
    order.status === "matched"
  ) {
    return {
      key: "waiting_schedule" as Filter,
      label: "Aguardando agendamento",
      description:
        "O serviço está confirmado. Escolha um horário disponível.",
      className:
        "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    };
  }

  return {
    key: "pending" as Filter,
    label: "Aguardando profissional",
    description: "Estamos buscando o profissional adequado.",
    className:
      "border-zinc-700 bg-zinc-900 text-zinc-300",
  };
}

function getFilterLabel(filter: Filter) {
  switch (filter) {
    case "all":
      return "Todos";
    case "pending":
      return "Aguardando profissional";
    case "waiting_schedule":
      return "Aguardando agendamento";
    case "scheduled":
      return "Agendado";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    case "cancelled":
      return "Cancelado";
  }
}

export default function ClienteServicosPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [name, setName] = useState("Cliente");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, user_type, status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        profileError ||
        !profile ||
        profile.user_type !== "client" ||
        profile.status === "blocked"
      ) {
        router.replace("/login");
        return;
      }

      setName(profile.full_name || "Cliente");

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, service_id, address_id, price, currency, status, scheduled_start, scheduled_end, created_at"
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (orderError) {
        setErrorMessage(
          "Não foi possível carregar seus serviços."
        );
        setLoading(false);
        return;
      }

      const orderList = orderData ?? [];

      if (orderList.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const serviceIds = [
        ...new Set(orderList.map((order) => order.service_id)),
      ];

      const addressIds = [
        ...new Set(orderList.map((order) => order.address_id)),
      ];

      const orderIds = orderList.map((order) => order.id);

      const [
        { data: serviceData },
        { data: addressData },
        { data: appointmentData },
      ] = await Promise.all([
        supabase
          .from("services")
          .select("id, code, name")
          .in("id", serviceIds),

        supabase
          .from("addresses")
          .select(
            "id, label, street, number, neighborhood, city, state"
          )
          .in("id", addressIds),

        supabase
          .from("appointments")
          .select(
            "id, order_id, starts_at, ends_at, status"
          )
          .in("order_id", orderIds)
          .order("starts_at", { ascending: false }),
      ]);

      if (cancelled) {
        return;
      }

      const serviceMap: Record<string, Service> = {};
      const addressMap: Record<string, Address> = {};
      const appointmentMap: Record<string, Appointment> = {};

      for (const service of serviceData ?? []) {
        serviceMap[service.id] = service;
      }

      for (const address of addressData ?? []) {
        addressMap[address.id] = address;
      }

      for (const appointment of appointmentData ?? []) {
        if (!appointmentMap[appointment.order_id]) {
          appointmentMap[appointment.order_id] = appointment;
        }
      }

      setOrders(
        orderList.map((order) => ({
          order,
          service: serviceMap[order.service_id],
          address: addressMap[order.address_id],
          appointment: appointmentMap[order.id],
        }))
      );

      setLoading(false);
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders.filter(
      (item) => getDisplayStatus(item).key === filter
    );
  }, [orders, filter]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">
          Carregando seus serviços...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/cliente")}
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
              <p className="text-xs text-zinc-500">
                Área do cliente
              </p>

              <p className="text-sm text-zinc-200">
                Olá,{" "}
                <span className="font-semibold text-white">
                  {name}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-green-500 hover:text-green-400"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/cliente")}
          className="text-sm font-semibold text-green-400 transition hover:text-green-300"
        >
          ← Voltar para minha área
        </button>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-green-400">
              SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight">
              Meus serviços
            </h1>

            <p className="mt-2 text-zinc-400">
              Acompanhe seus pedidos, agendamentos e histórico de serviços.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/cliente")}
            className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-black transition hover:bg-green-400"
          >
            + Solicitar novo serviço
          </button>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-zinc-800 bg-black md:grid-cols-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`border-b border-zinc-800 p-5 text-left transition md:border-b-0 md:border-r ${
              filter === "all"
                ? "bg-green-500/10"
                : "hover:bg-zinc-900"
            }`}
          >
            <p
              className={`font-semibold ${
                filter === "all"
                  ? "text-green-400"
                  : "text-white"
              }`}
            >
              Meus serviços
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Acompanhe seus pedidos
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("scheduled")}
            className={`border-b border-zinc-800 p-5 text-left transition md:border-b-0 md:border-r ${
              filter === "scheduled"
                ? "bg-green-500/10"
                : "hover:bg-zinc-900"
            }`}
          >
            <p
              className={`font-semibold ${
                filter === "scheduled"
                  ? "text-green-400"
                  : "text-white"
              }`}
            >
              Agendamentos
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Consulte seus horários
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`p-5 text-left transition ${
              filter === "completed"
                ? "bg-green-500/10"
                : "hover:bg-zinc-900"
            }`}
          >
            <p
              className={`font-semibold ${
                filter === "completed"
                  ? "text-green-400"
                  : "text-white"
              }`}
            >
              Histórico
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Serviços realizados
            </p>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {(
            [
              "all",
              "pending",
              "waiting_schedule",
              "scheduled",
              "in_progress",
              "completed",
              "cancelled",
            ] as Filter[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === item
                  ? "border-green-500 bg-green-500 text-black"
                  : "border-zinc-700 bg-black text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {getFilterLabel(item)}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
              +
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Nenhum serviço encontrado
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Seus pedidos, agendamentos e serviços realizados aparecerão
              aqui.
            </p>

            <button
              type="button"
              onClick={() => router.push("/cliente")}
              className="mt-6 rounded-xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400"
            >
              Solicitar novo serviço
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredOrders.map((item) => {
              const status = getDisplayStatus(item);
              const { order, service, address, appointment } = item;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-5 transition hover:border-zinc-700"
                >
                  <div className="grid gap-6 lg:grid-cols-[1.5fr_0.7fr_1fr_auto] lg:items-center">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
                        ⚒
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-white">
                          {service?.name || "Serviço VemGO"}
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                          {service?.code || "Serviço"}
                        </p>

                        {address && (
                          <p className="mt-3 text-sm text-zinc-400">
                            {address.street}, {address.number} ·{" "}
                            {address.neighborhood} · {address.city}/
                            {address.state}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-zinc-600">
                          Solicitado em {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <p className="text-xs text-zinc-500">
                        Valor do serviço
                      </p>

                      <p className="mt-1 text-xl font-semibold text-white">
                        {formatCurrency(Number(order.price))}
                      </p>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>

                      <p className="mt-3 text-sm text-zinc-400">
                        {status.description}
                      </p>

                      {appointment?.status === "confirmed" && (
                        <p className="mt-2 text-sm font-semibold text-green-400">
                          {formatDate(appointment.starts_at)} às{" "}
                          {formatTime(appointment.starts_at)}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-zinc-800 pt-4 lg:border-t-0 lg:pt-0">
                      {order.status === "confirmed" &&
                      !appointment ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`
                            )
                          }
                          className="w-full rounded-xl border border-green-500/50 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500 hover:text-black"
                        >
                          Agendar →
                        </button>
                      ) : appointment &&
                        appointment.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`
                            )
                          }
                          className="w-full rounded-xl border border-green-500/50 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500 hover:text-black"
                        >
                          Ver solicitação →
                        </button>
                      ) : appointment &&
                        appointment.status === "confirmed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`
                            )
                          }
                          className="w-full rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-green-500 hover:text-green-400"
                        >
                          Ver agendamento →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`
                            )
                          }
                          className="w-full rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-green-500 hover:text-green-400"
                        >
                          Ver detalhes →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}