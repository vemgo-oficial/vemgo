"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  canClientCancelRequest,
  getClientAppointmentActions,
  getClientAppointmentState,
} from "@/lib/client-appointment-status";

type Appointment = {
  id: string;
  order_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  client_outcome: string | null;
  client_outcome_note: string | null;
  client_reported_at: string | null;
  created_at: string;
};

type ClientAction = "cancel" | "no_show" | "satisfied" | "problem";

type Order = {
  id: string;
  request_id: string;
  client_id: string;
  professional_id: string | null;
  service_id: string;
  address_id: string;
  price: number | null;
  currency: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type RequestInfo = {
  id: string;
  description: string | null;
  urgency: string | null;
  status: string;
  service_id: string | null;
  address_id: string;
  created_at: string;
  updated_at: string;
};

type ServiceInfo = {
  id: string;
  name: string;
  code: string;
};

type AddressInfo = {
  label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

type ProfileInfo = {
  full_name: string | null;
  avatar_url: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não disponível";

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(Number(value))) {
    return "Preço não informado";
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  } catch {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
}

function requestStatusCopy(status: string) {
  const copy: Record<string, { title: string; description: string }> = {
    pending: {
      title: "Solicitação recebida",
      description: "Sua solicitação foi registrada e aguarda processamento.",
    },
    classified: {
      title: "Serviço identificado",
      description:
        "A solicitação foi classificada. Acompanhe aqui as atualizações da busca de profissionais.",
    },
    matching: {
      title: "Buscando profissionais",
      description:
        "Estamos procurando profissionais compatíveis com sua solicitação.",
    },
    matched: {
      title: "Aguardando aceite",
      description:
        "Há profissionais associados à solicitação. Acompanhe as próximas atualizações.",
    },
    scheduled: {
      title: "Agendamento registrado",
      description: "A solicitação avançou para a etapa de agendamento.",
    },
    cancelled: {
      title: "Solicitação cancelada",
      description: "Esta solicitação está encerrada.",
    },
    expired: {
      title: "Solicitação expirada",
      description: "Esta solicitação expirou e não está mais ativa.",
    },
    completed: {
      title: "Solicitação concluída",
      description: "Esta solicitação está marcada como concluída.",
    },
  };

  return (
    copy[status] ?? {
      title: "Solicitação em andamento",
      description: `Status atual: ${status}`,
    }
  );
}

function appointmentStatus(
  appointment: Appointment,
  orderStatus: string,
  now: number | null,
) {
  const state = getClientAppointmentState(appointment, orderStatus, now);

  switch (state) {
    case "scheduled":
      return {
        title: "Aguardando confirmação do profissional",
        description:
          "Sua solicitação de horário foi enviada. O atendimento só estará confirmado quando o profissional aceitar.",
        className:
          "border-amber-700/70 bg-amber-950/30 text-amber-300",
      };

    case "confirmed":
      return {
        title: "Agendamento confirmado",
        description: "O profissional aceitou o horário solicitado.",
        className:
          "border-emerald-700/70 bg-emerald-950/30 text-emerald-300",
      };

    case "cancelled":
      return {
        title:
          appointment.client_outcome === "cancelled_by_client"
            ? "Atendimento cancelado por você"
            : "Horário recusado ou cancelado",
        description:
          appointment.client_outcome === "cancelled_by_client"
            ? "O horário e o pedido foram cancelados. Se ainda precisar do serviço, faça uma nova solicitação."
            : "Este horário não está confirmado. Volte aos seus serviços para verificar as opções disponíveis.",
        className: "border-red-700/70 bg-red-950/30 text-red-300",
      };

    case "rejected":
      return {
        title: "Horário recusado pelo profissional",
        description:
          "Este horário não foi aceito. Verifique as opções disponíveis em Meus serviços.",
        className: "border-red-700/70 bg-red-950/30 text-red-300",
      };

    case "in_progress":
      return {
        title: "Atendimento em andamento",
        description: "O atendimento já foi iniciado.",
        className: "border-sky-700/70 bg-sky-950/30 text-sky-300",
      };

    case "completed":
      return {
        title: "Atendimento concluído",
        description:
          appointment.client_outcome === "problem_reported"
            ? "Você relatou um problema. O pedido foi encaminhado para revisão, sem penalidade automática ao profissional."
            : appointment.client_outcome === "satisfied"
              ? "Você confirmou que o atendimento foi realizado satisfatoriamente."
              : "O atendimento foi encerrado. Você ainda pode informar o resultado.",
        className: "border-zinc-700 bg-zinc-900 text-zinc-300",
      };

    case "disputed":
      return {
        title: "Pendente de revisão",
        description:
          "Você relatou um problema. O caso foi encaminhado para revisão, sem penalidade automática ao profissional.",
        className:
          "border-amber-700/70 bg-amber-950/30 text-amber-300",
      };

    case "no_show":
      return {
        title: "Relato de não comparecimento enviado",
        description:
          "O relato foi registrado para revisão. Ele não determina culpa nem aplica penalidades automaticamente.",
        className: "border-zinc-700 bg-zinc-900 text-zinc-300",
      };

    case "regularization":
      return {
        title: "Pendente de regularização",
        description:
          appointment.status === "scheduled"
            ? "O horário passou sem confirmação do profissional. Verifique a situação antes de solicitar outro horário."
            : "O horário passou e ainda não há registro de conclusão ou não comparecimento. A situação precisa ser regularizada.",
        className:
          "border-amber-700/70 bg-amber-950/30 text-amber-300",
      };

    case "started_unreported":
      return {
        title: "Horário iniciado — aguardando atualização",
        description:
          "O horário programado já começou, mas ainda não há atualização suficiente do atendimento. A situação precisa ser regularizada.",
        className:
          "border-amber-700/70 bg-amber-950/30 text-amber-300",
      };

    default:
      return {
        title: `Status do agendamento: ${appointment.status}`,
        description: "Consulte esta tela para acompanhar a atualização.",
        className: "border-zinc-700 bg-zinc-900 text-zinc-300",
      };
  }
}

export default function ClienteAgendamentoPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const recordId = params.orderId;
  const supabase = createSupabaseBrowserClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [professional, setProfessional] = useState<ProfileInfo | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentLifecycleAvailable, setAppointmentLifecycleAvailable] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [clientAction, setClientAction] = useState<ClientAction | null>(null);
  const [clientActionNote, setClientActionNote] = useState("");
  const [clientActionBusy, setClientActionBusy] = useState(false);
  const [clientActionMessage, setClientActionMessage] = useState("");

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();

    const timer = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id,user_type,status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || profile.user_type !== "client") {
          router.replace(
            profile?.user_type === "professional"
              ? "/profissional"
              : profile?.user_type === "admin"
                ? "/controle"
                : "/login",
          );
          return;
        }

        if (profile.status === "blocked") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        let lifecycleAvailable = true;

        const { error: lifecycleError } = await supabase.rpc(
          "get_client_appointment_actions",
          { p_record_id: recordId },
        );

        if (
          lifecycleError &&
          /function|schema cache|does not exist|could not find/i.test(
            lifecycleError.message,
          )
        ) {
          lifecycleAvailable = false;
          console.warn(
            "[VemGO] RPC de ações do atendimento não está disponível neste ambiente.",
          );
        }

        const orderSelect =
          "id, request_id, client_id, professional_id, service_id, address_id, price, currency, status, scheduled_start, scheduled_end, started_at, completed_at, created_at";

        const requestSelect =
          "id, description, urgency, status, service_id, address_id, created_at, updated_at";

        const { data: orderById, error: orderByIdError } = await supabase
          .from("orders")
          .select(orderSelect)
          .eq("id", recordId)
          .eq("client_id", user.id)
          .maybeSingle();

        if (orderByIdError) throw orderByIdError;

        let currentOrder = (orderById as Order | null) ?? null;
        let currentRequest: RequestInfo | null = null;

        if (!currentOrder) {
          const { data: requestById, error: requestError } = await supabase
            .from("requests")
            .select(requestSelect)
            .eq("id", recordId)
            .eq("client_id", user.id)
            .maybeSingle();

          if (requestError) throw requestError;

          currentRequest = (requestById as RequestInfo | null) ?? null;

          if (currentRequest) {
            const { data: relatedOrder, error: relatedOrderError } =
              await supabase
                .from("orders")
                .select(orderSelect)
                .eq("request_id", currentRequest.id)
                .eq("client_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (relatedOrderError) throw relatedOrderError;

            currentOrder = (relatedOrder as Order | null) ?? null;
          }
        } else if (currentOrder.request_id) {
          const { data: requestData, error: requestError } = await supabase
            .from("requests")
            .select(requestSelect)
            .eq("id", currentOrder.request_id)
            .eq("client_id", user.id)
            .maybeSingle();

          if (requestError) throw requestError;

          currentRequest = (requestData as RequestInfo | null) ?? null;
        }

        setOrder(currentOrder);
        setRequest(currentRequest);

        if (!currentOrder) {
          setAppointment(null);
          setProfessional(null);
          setService(null);
          setAddress(null);
          setAppointmentLifecycleAvailable(lifecycleAvailable);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const [serviceResult, addressResult, appointmentResult] =
          await Promise.all([
            supabase
              .from("services")
              .select("id,name,code")
              .eq("id", currentOrder.service_id)
              .maybeSingle(),

            supabase
              .from("addresses")
              .select(
                "label,street,number,complement,neighborhood,city,state",
              )
              .eq("id", currentOrder.address_id)
              .maybeSingle(),

            supabase
              .from("appointments")
              .select(
                "id, order_id, professional_id, starts_at, ends_at, status, confirmed_at, cancelled_at, cancellation_reason, client_outcome, client_outcome_note, client_reported_at, created_at",
              )
              .eq("order_id", currentOrder.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        if (serviceResult.error) {
          console.error(
            "[VemGO] Erro ao carregar serviço:",
            serviceResult.error.message,
          );
        }

        if (addressResult.error) {
          console.error(
            "[VemGO] Erro ao carregar endereço:",
            addressResult.error.message,
          );
        }

        if (appointmentResult.error) {
          console.error(
            "[VemGO] Erro ao carregar agendamento:",
            appointmentResult.error.message,
          );
        }

        setService((serviceResult.data as ServiceInfo | null) ?? null);
        setAddress((addressResult.data as AddressInfo | null) ?? null);

        const appointmentData =
          (appointmentResult.data as Appointment | null) ?? null;

        setAppointment(appointmentData);
        setAppointmentLifecycleAvailable(lifecycleAvailable);

        if (currentOrder.professional_id) {
          const { data: profileData, error: professionalError } =
            await supabase
              .from("profiles")
              .select("full_name,avatar_url")
              .eq("id", currentOrder.professional_id)
              .maybeSingle();

          if (professionalError) {
            console.error(
              "[VemGO] Erro ao carregar profissional:",
              professionalError.message,
            );
          }

          setProfessional((profileData as ProfileInfo | null) ?? null);
        } else {
          setProfessional(null);
        }
      } catch (err) {
        console.error("[VemGO] Erro ao carregar acompanhamento:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o acompanhamento.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recordId, router, supabase],
  );

  useEffect(() => {
    if (!recordId) return;

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [recordId, loadData]);

  useEffect(() => {
    if (!recordId) return;

    const timer = window.setInterval(() => {
      void loadData(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [recordId, loadData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center text-zinc-400">
          Carregando acompanhamento do atendimento...
        </div>
      </main>
    );
  }

  const requestStatus = request
    ? requestStatusCopy(request.status)
    : null;

  const status =
    appointment && order
      ? appointmentStatus(appointment, order.status, now)
      : null;

  const mapsAddress = address
    ? [
        address.street,
        address.number,
        address.complement,
        address.neighborhood,
        address.city,
        address.state,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const mapsUrl = mapsAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`
    : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <Link
            href="/cliente"
            className="text-lg font-bold tracking-wide text-white"
          >
            Vem<span className="text-emerald-400">GO</span>
          </Link>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <Link
          href="/cliente"
          className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          ← Voltar para minha área
        </Link>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            ACOMPANHAMENTO
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Meu atendimento
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Acompanhe o andamento da solicitação, os dados do profissional e
            as informações do agendamento.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-800 bg-red-950/40 p-5 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {status && (
          <div
            className={`mt-8 rounded-2xl border p-6 ${status.className}`}
          >
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">
              Status do atendimento
            </p>
            <h2 className="mt-2 text-xl font-bold">{status.title}</h2>
            <p className="mt-2 text-sm leading-6 opacity-90">
              {status.description}
            </p>
            <p className="mt-4 text-xs opacity-70">
              {refreshing
                ? "Atualizando informações..."
                : "As informações são atualizadas automaticamente."}
            </p>
          </div>
        )}

        {!order && request && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Solicitação
            </p>
            <h2 className="mt-2 text-xl font-bold">
              {requestStatus?.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {requestStatus?.description}
            </p>
            {request.description && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {request.description}
              </p>
            )}
          </div>
        )}

        {order && (
          <>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Serviço
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  {service?.name || "Serviço solicitado"}
                </h2>
                {service?.code && (
                  <p className="mt-2 text-sm text-zinc-400">
                    Código: {service.code}
                  </p>
                )}
                {request?.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {request.description}
                  </p>
                )}
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-500">Valor</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {formatPrice(order.price, order.currency)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Endereço do atendimento
                </p>
                <h2 className="mt-2 text-lg font-bold">
                  {address?.label || "Local do atendimento"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {[
                    address?.street,
                    address?.number,
                    address?.complement,
                    address?.neighborhood,
                    address?.city,
                    address?.state,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Endereço não disponível."}
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline