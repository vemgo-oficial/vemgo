"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getClientAppointmentState } from "@/lib/client-appointment-status";

type Order = {
  id: string;
  request_id: string | null;
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
  cancellation_reason: string | null;
  client_outcome?: string | null;
};

type DisplayOrder = {
  order: Order;
  service?: Service;
  address?: Address;
  appointment?: Appointment;
};

type ClientRequest = {
  id: string;
  description: string;
  status: string;
  service_id: string | null;
  address_id: string;
  created_at: string;
};

type DisplayRequest = {
  request: ClientRequest;
  service?: Service;
  address?: Address;
};

type Filter =
  | "all"
  | "pending"
  | "waiting_schedule"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "regularization"
  | "no_show"
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

function getDisplayStatus(item: DisplayOrder, now: number | null) {
  const { order, appointment } = item;
  const appointmentState = getClientAppointmentState(appointment, order.status, now);

  if (appointmentState === "cancelled" || appointmentState === "rejected") {
    return {
      key: "cancelled" as Filter,
      label: appointmentState === "rejected" ? "Recusado" : "Cancelado",
      description: appointmentState === "rejected"
        ? "O horário foi recusado pelo profissional. Consulte as opções disponíveis."
        : "Este serviço foi cancelado.",
      className:
        "border-red-500/40 bg-red-500/10 text-red-400",
    };
  }

  if (appointmentState === "completed") {
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

  if (appointmentState === "in_progress") {
    return {
      key: "in_progress" as Filter,
      label: "Em andamento",
      description: "O serviço está em execução.",
      className:
        "border-blue-500/40 bg-blue-500/10 text-blue-400",
    };
  }

  if (appointmentState === "regularization" || appointmentState === "started_unreported") {
    return {
      key: "regularization" as Filter,
      label: appointmentState === "started_unreported"
        ? "Horário iniciado — aguardando atualização"
        : "Pendente de regularização",
      description: appointmentState === "started_unreported"
        ? appointment?.status === "scheduled"
          ? "O horário começou, mas ainda aguarda confirmação do profissional. A situação precisa ser regularizada."
          : "O horário começou, mas ainda não há atualização sobre o atendimento. O status precisa ser regularizado."
        : appointment?.status === "scheduled"
          ? "O horário passou sem confirmação do profissional. Verifique a situação antes de solicitar outro horário."
          : "O horário passou e o atendimento ainda não foi marcado como concluído ou não comparecido. Verifique a situação.",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    };
  }

  if (appointmentState === "no_show") {
    return {
      key: "no_show" as Filter,
      label: "Não compareceu",
      description: "O atendimento foi registrado como não comparecimento.",
      className: "border-zinc-600 bg-zinc-900 text-zinc-300",
    };
  }

  if (appointmentState === "disputed") {
    return {
      key: "regularization" as Filter,
      label: "Pendente de revisão",
      description: "Você relatou um problema. O caso foi encaminhado para revisão, sem penalidade automática.",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    };
  }

  if (appointment && appointmentState === "confirmed") {
    return {
      key: "scheduled" as Filter,
      label: "Agendado",
      description: `${formatDate(appointment.starts_at)} às ${formatTime(appointment.starts_at)}`,
      className:
        "border-blue-500/40 bg-blue-500/10 text-blue-400",
    };
  }

  if (appointment && appointmentState === "scheduled") {
    return {
      key: "waiting_schedule" as Filter,
      label: "Aguardando confirmação",
      description: `Horário solicitado em ${formatDateTime(appointment.starts_at)}`,
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
    description:
      "Estamos buscando o profissional adequado.",
    className:
      "border-zinc-700 bg-zinc-900 text-zinc-300",
  };
}

function getRequestDisplayStatus(request: ClientRequest) {
  const labels: Record<string, { label: string; description: string; className: string; key: Filter }> = {
    pending: { key: "pending", label: "Solicitação recebida", description: "A solicitação aguarda processamento.", className: "border-zinc-700 bg-zinc-900 text-zinc-300" },
    classified: { key: "pending", label: "Serviço identificado", description: "A solicitação foi classificada.", className: "border-zinc-700 bg-zinc-900 text-zinc-300" },
    matching: { key: "pending", label: "Buscando profissional", description: "Estamos procurando um profissional compatível.", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    matched: { key: "pending", label: "Aguardando aceite", description: "Um profissional está avaliando a solicitação.", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    cancelled: { key: "cancelled", label: "Cancelado", description: "Esta solicitação foi cancelada.", className: "border-red-500/40 bg-red-500/10 text-red-300" },
    expired: { key: "cancelled", label: "Expirado", description: "Esta solicitação expirou.", className: "border-zinc-600 bg-zinc-900 text-zinc-400" },
    completed: { key: "completed", label: "Concluído", description: "Esta solicitação foi concluída.", className: "border-green-500/40 bg-green-500/10 text-green-400" },
    scheduled: { key: "scheduled", label: "Agendamento registrado", description: "A solicitação avançou para o agendamento.", className: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
  };
  return labels[request.status] ?? { key: "pending" as Filter, label: "Em andamento", description: `Status: ${request.status}`, className: "border-zinc-700 bg-zinc-900 text-zinc-300" };
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
    case "regularization":
      return "Pendente de regularização";
    case "no_show":
      return "Não compareceu";
    case "cancelled":
      return "Cancelado";
  }
}

function hasActiveAppointment(appointment?: Appointment) {
  return (
    !!appointment &&
    ["scheduled", "confirmed", "in_progress"].includes(
      appointment.status,
    )
  );
}

export default function ClienteServicosPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("user_type, status")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.user_type !== "client" ||
      profile.status === "blocked"
    ) {
      router.replace("/login");
      return;
    }

    const { data: orderData, error: orderError } =
      await supabase
        .from("orders")
        .select(
          "id, request_id, service_id, address_id, price, currency, status, scheduled_start, scheduled_end, created_at",
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

    const { data: requestData, error: requestError } = await supabase
      .from("requests")
      .select("id, description, status, service_id, address_id, created_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error(
        "[VemGO] Erro ao carregar pedidos:",
        orderError.message,
      );
      setErrorMessage("Não foi possível carregar seus serviços.");
      setLoading(false);
      return;
    }

    const orderList = orderData ?? [];
    if (requestError) {
      console.error("[VemGO] Erro ao carregar solicitações:", requestError.message);
      setErrorMessage("Não foi possível carregar todas as suas solicitações.");
    }

    const requestsWithNoOrder = (requestData ?? []).filter(
      (request) => !orderList.some((order) => order.request_id === request.id),
    ) as ClientRequest[];

    if (requestsWithNoOrder.length) {
      const requestServiceIds = [...new Set(requestsWithNoOrder.flatMap((request) => request.service_id ? [request.service_id] : []))];
      const requestAddressIds = [...new Set(requestsWithNoOrder.map((request) => request.address_id))];
      const [{ data: requestServices }, { data: requestAddresses }] = await Promise.all([
        requestServiceIds.length ? supabase.from("services").select("id, code, name").in("id", requestServiceIds) : Promise.resolve({ data: [] }),
        requestAddressIds.length ? supabase.from("addresses").select("id, label, street, number, neighborhood, city, state").in("id", requestAddressIds) : Promise.resolve({ data: [] }),
      ]);
      const serviceMap = Object.fromEntries((requestServices ?? []).map((service) => [service.id, service])) as Record<string, Service>;
      const addressMap = Object.fromEntries((requestAddresses ?? []).map((address) => [address.id, address])) as Record<string, Address>;
      setRequests(requestsWithNoOrder.map((request) => ({ request, service: request.service_id ? serviceMap[request.service_id] : undefined, address: addressMap[request.address_id] })));
    } else {
      setRequests([]);
    }

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
      { data: serviceData, error: serviceError },
      { data: addressData, error: addressError },
      appointmentResult,
    ] = await Promise.all([
      supabase
        .from("services")
        .select("id, code, name")
        .in("id", serviceIds),

      supabase
        .from("addresses")
        .select(
          "id, label, street, number, neighborhood, city, state",
        )
        .in("id", addressIds),

      supabase
        .from("appointments")
        .select("id, order_id, starts_at, ends_at, status, cancellation_reason, client_outcome")
        .in("order_id", orderIds)
        .order("starts_at", { ascending: false }),
    ]);

    // Compatibilidade com ambientes onde a migração de resultado ainda não foi instalada.
    const appointmentResultFallback = appointmentResult.error
      ? await supabase
          .from("appointments")
          .select("id, order_id, starts_at, ends_at, status, cancellation_reason")
          .in("order_id", orderIds)
          .order("starts_at", { ascending: false })
      : appointmentResult;
    const appointmentData = appointmentResultFallback.data;
    const appointmentError = appointmentResultFallback.error;

    if (serviceError || addressError || appointmentError) {
      console.error("[VemGO] Erro ao carregar detalhes:", {
        services: serviceError?.message,
        addresses: addressError?.message,
        appointments: appointmentError?.message,
      });

      setErrorMessage(
        "Alguns detalhes dos serviços não puderam ser carregados. Atualize a página.",
      );
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

    // A consulta está ordenada do mais recente para o mais antigo.
    // Mantemos o agendamento mais recente de cada pedido.
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
      })),
    );

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders.filter(
      (item) => getDisplayStatus(item, now).key === filter,
    );
  }, [orders, filter, now]);

  const filteredRequests = useMemo(() => requests.filter((item) => {
    if (filter === "all") return true;
    return getRequestDisplayStatus(item.request).key === filter;
  }), [requests, filter]);

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
      <section className="mx-auto max-w-6xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/cliente")}
          className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-green-400 transition hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        >
          <span aria-hidden="true">←</span>
          <span>Voltar para minha área</span>
        </button>
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-green-400">
            SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            Meus serviços
          </h1>

          <p className="mt-2 text-zinc-400">
            Acompanhe seus pedidos, agendamentos e histórico de
            serviços.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-400">
            Consulte os serviços solicitados e seus respectivos
            status.
          </p>

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
                filter === "all" ? "text-green-400" : "text-white"
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
              "regularization",
              "no_show",
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
            <button
              type="button"
              onClick={() => void loadData()}
              className="ml-3 font-semibold underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {filteredOrders.length === 0 && filteredRequests.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
              +
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Nenhum serviço encontrado
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Seus pedidos, agendamentos e serviços realizados
              aparecerão aqui.
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
            {filteredRequests.map(({ request, service, address }) => {
              const status = getRequestDisplayStatus(request);
              return (
                <article key={request.id} className="rounded-2xl border border-zinc-800 bg-black p-5 transition hover:border-zinc-700">
                  <div className="grid gap-5 lg:grid-cols-[1.5fr_0.7fr_1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-white">{service?.name || "Solicitação de serviço"}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{service?.code || "Serviço"}</p>
                      <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{request.description}</p>
                      {address && <p className="mt-2 text-sm text-zinc-500">{address.street}, {address.number} · {address.neighborhood} · {address.city}/{address.state}</p>}
                      <p className="mt-2 text-xs text-zinc-600">Solicitado em {formatDateTime(request.created_at)}</p>
                    </div>
                    <div className="lg:border-l lg:border-zinc-800 lg:pl-5"><p className="text-xs text-zinc-500">Valor</p><p className="mt-1 text-sm text-zinc-400">Ainda não registrado</p></div>
                    <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span><p className="mt-3 text-sm text-zinc-400">{status.description}</p></div>
                    <button type="button" onClick={() => router.push(`/cliente/agendamento/${request.id}`)} className="w-full rounded-xl border border-green-500/50 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">Acompanhar →</button>
                  </div>
                </article>
              );
            })}
            {filteredOrders.map((item) => {
              const status = getDisplayStatus(item, now);
              const { order, service, address, appointment } = item;

              const activeAppointment =
                hasActiveAppointment(appointment);

              const canSchedule =
                ["confirmed", "matched"].includes(order.status) &&
                !activeAppointment &&
                appointment?.status !== "no_show";

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-5 transition hover:border-zinc-700"
                >
                  <div className="grid gap-6 lg:grid-cols-[1.5fr_0.7fr_1fr_auto] lg:items-center">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
                        ⚡
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
                          Solicitado em{" "}
                          {formatDateTime(order.created_at)}
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

                      {appointment &&
                        ["scheduled", "confirmed"].includes(
                          appointment.status,
                        ) && (
                          <p className="mt-2 text-sm font-semibold text-green-400">
                            {formatDate(appointment.starts_at)} às{" "}
                            {formatTime(appointment.starts_at)}
                          </p>
                        )}
                    </div>

                    <div className="border-t border-zinc-800 pt-4 lg:border-t-0 lg:pt-0">
                      {canSchedule ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento?orderId=${order.id}`,
                            )
                          }
                          className="w-full rounded-xl border border-green-500/50 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500 hover:text-black"
                        >
                          Agendar →
                        </button>
                      ) : appointment?.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`,
                            )
                          }
                          className="w-full rounded-xl border border-green-500/50 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500 hover:text-black"
                        >
                          Ver agendamento →
                        </button>
                      ) : appointment?.status === "confirmed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/cliente/agendamento/${order.id}`,
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
                              `/cliente/agendamento/${order.id}`,
                            )
                          }
                          className="w-full rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-green-500 hover:text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
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
