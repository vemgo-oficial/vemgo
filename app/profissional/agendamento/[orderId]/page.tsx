
"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Order = {
  id: string;
  status: string;
  price: number | null;
  professional_id: string;
  client_id: string;
  service_id: string;
  address_id: string;
};

type ClientProfile = {
  full_name?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  photo_url?: string | null;
  profile_photo?: string | null;
};

type ServiceInfo = {
  name?: string | null;
  title?: string | null;
  code?: string | null;
  service_code?: string | null;
};

type AddressInfo = {
  label?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  client_outcome: string | null;
  client_outcome_note: string | null;
  client_reported_at: string | null;
};

type Profile = {
  full_name: string | null;
  user_type: string;
  status: string;
};

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(Number(value))) {
    return "Valor não informado";
  }

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não disponível";

  return date.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }

  return fallback;
}

function addressText(address: AddressInfo | null) {
  if (!address) return "Endereço não disponível.";

  return [
    address.street,
    address.number,
    address.complement,
    address.neighborhood,
    address.city,
    address.state,
    address.postal_code,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ") || "Endereço não disponível.";
}

function mapsUrl(address: AddressInfo | null) {
  if (!address) return null;

  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);

  if (
    address.latitude != null &&
    address.longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  const destination = addressText(address);
  if (destination === "Endereço não disponível.") return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export default function ProfessionalAppointmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId =
    typeof params?.orderId === "string" ? params.orderId : "";

  const [name, setName] = useState("Profissional");
  const [order, setOrder] = useState<Order | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string | null>(null);
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);

  const loadPage = useCallback(async () => {
    if (!orderId) {
      setError("Pedido inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();

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
        .select("full_name,user_type,status")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const typedProfile = profile as Profile | null;

      if (!typedProfile) {
        router.replace("/login");
        return;
      }

      if (typedProfile.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (typedProfile.user_type !== "professional") {
        router.replace(
          typedProfile.user_type === "client"
            ? "/cliente"
            : typedProfile.user_type === "admin"
              ? "/controle"
              : "/login",
        );
        return;
      }

      setName(typedProfile.full_name?.trim() || "Profissional");

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id,status,price,professional_id,client_id,service_id,address_id")
        .eq("id", orderId)
        .eq("professional_id", user.id)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        setError("Pedido não encontrado para este profissional.");
        setOrder(null);
        setAppointment(null);
        return;
      }

      const typedOrder = orderData as Order;
      setOrder(typedOrder);

      const [clientResult, serviceResult, addressResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,name,avatar_url,avatar_path,photo_url,profile_photo")
          .eq("id", typedOrder.client_id)
          .maybeSingle(),

        supabase
          .from("services")
          .select("name,title,code,service_code")
          .eq("id", typedOrder.service_id)
          .maybeSingle(),

        supabase
          .from("addresses")
          .select("*")
          .eq("id", typedOrder.address_id)
          .maybeSingle(),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (serviceResult.error) throw serviceResult.error;
      if (addressResult.error) throw addressResult.error;

      const typedClient =
        (clientResult.data as ClientProfile | null) ?? null;

      const typedAddress =
        (addressResult.data as AddressInfo | null) ?? null;

      setClient(typedClient);
      setService((serviceResult.data as ServiceInfo | null) ?? null);
      setAddress(typedAddress);

      const avatarCandidate =
        typedClient?.avatar_url ??
        typedClient?.avatar_path ??
        typedClient?.photo_url ??
        typedClient?.profile_photo;

      const storedAvatar =
        typeof avatarCandidate === "string" ? avatarCandidate.trim() : "";

      if (!storedAvatar) {
        setClientAvatarUrl(null);
      } else if (/^https?:\/\//i.test(storedAvatar)) {
        setClientAvatarUrl(storedAvatar);
      } else {
        let avatarPath = storedAvatar.replace(/^\/+/, "");
        avatarPath = avatarPath.replace(/^profile-photos\//, "");

        const { data: signedAvatar, error: avatarError } =
          await supabase.storage
            .from("profile-photos")
            .createSignedUrl(avatarPath, 60 * 60);

        if (avatarError) {
          setClientAvatarUrl(null);
        } else {
          setClientAvatarUrl(signedAvatar?.signedUrl ?? null);
        }
      }

      const { data: appointmentData, error: appointmentError } =
        await supabase
          .from("appointments")
          .select(
            "id,order_id,professional_id,starts_at,ends_at,status,confirmed_at,cancelled_at,cancellation_reason,client_outcome,client_outcome_note,client_reported_at",
          )
          .eq("order_id", orderId)
          .eq("professional_id", user.id)
          .in("status", [
            "scheduled",
            "confirmed",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
          ])
          .order("starts_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (appointmentError) throw appointmentError;

      setAppointment((appointmentData as Appointment | null) ?? null);
    } catch (err: unknown) {
      console.error("Erro ao carregar chamado:", err);
      setError(errorMessage(err, "Não foi possível carregar o chamado."));
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  async function handleDecision(decision: "confirmed" | "declined") {
    if (!appointment || processing) return;

    const accepted = decision === "confirmed";
    const confirmed = window.confirm(
      accepted
        ? "Deseja aceitar este chamado e confirmar o atendimento neste horário?"
        : "Deseja recusar este chamado? O cliente precisará escolher outra opção.",
    );

    if (!confirmed) return;

    setProcessing(true);
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "respond_to_appointment_request",
        {
          p_appointment_id: appointment.id,
          p_decision: decision,
        },
      );

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error("O servidor não retornou o agendamento atualizado.");
      }

      const updatedAppointment = Array.isArray(data) ? data[0] : data;

      setAppointment(updatedAppointment as Appointment);
      setMessage(
        accepted
          ? "Chamado aceito! O agendamento foi confirmado."
          : "Chamado recusado. O cliente poderá escolher outro horário.",
      );
      setFinished(true);

      window.setTimeout(() => {
        router.push("/profissional/agendamento");
      }, 1200);
    } catch (err: unknown) {
      console.error("Erro ao responder ao chamado:", err);
      setError(errorMessage(err, "Não foi possível processar o chamado."));
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPage]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-zinc-400">Carregando chamado...</p>
        </div>
      </main>
    );
  }

  if (!orderId) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-red-400">Pedido inválido.</p>
          <button
            type="button"
            onClick={() => router.push("/profissional/agendamento")}
            className="mt-4 rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-400"
          >
            Voltar para agendamentos
          </button>
        </div>
      </main>
    );
  }

  const destinationUrl = mapsUrl(address);

  return (
    <main className="min-h-screen bg-[#0C0A09] text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/profissional/agendamento")}
            className="flex items-center"
            aria-label="Voltar para agendamentos"
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
            onClick={() => router.push("/profissional/agendamento")}
            className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-400"
          >
            ← Voltar
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-orange-500">
            CHAMADO PROFISSIONAL
          </p>
          <h1 className="mt-3 text-3xl font-bold">Detalhes do chamado</h1>
          <p className="mt-2 text-zinc-400">
            Confira os dados do cliente e do serviço antes de aceitar ou recusar.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-5 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-orange-800 bg-orange-950/30 p-5 text-sm text-orange-200"
          >
            {message}
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
                  {appointment?.status === "scheduled"
                    ? "Aguardando sua resposta"
                    : appointment?.status === "confirmed"
                      ? "Chamado aceito"
                      : appointment?.status === "in_progress"
                        ? "Atendimento em andamento"
                        : "Chamado"}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Valor do chamado
                </p>
                <p className="mt-1 text-2xl font-bold text-orange-500">
                  {formatCurrency(order.price)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!order ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-8">
            <p className="text-xl font-semibold text-zinc-300">
              Não foi possível localizar este pedido.
            </p>
            <button
              type="button"
              onClick={() => router.push("/profissional/agendamento")}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400"
            >
              Voltar para agendamentos
            </button>
          </div>
        ) : !appointment ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-8">
            <p className="text-xl font-semibold text-zinc-300">
              Nenhum agendamento encontrado para este pedido.
            </p>
            <button
              type="button"
              onClick={() => router.push("/profissional/agendamento")}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400"
            >
              Voltar para agendamentos
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-black p-6">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Status
              </p>
              <p className="mt-1 text-xl font-semibold text-orange-400">
                {appointment.status === "scheduled"
                  ? "Aguardando sua resposta"
                  : appointment.status === "confirmed"
                    ? "Chamado aceito"
                    : appointment.status === "in_progress"
                      ? "Atendimento em andamento"
                      : appointment.status === "no_show"
                        ? "Relato de não comparecimento para revisão"
                        : appointment.status === "cancelled"
                          ? "Agendamento cancelado"
                          : "Atendimento encerrado"}
              </p>
            </div>

            {appointment.client_outcome && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-4"
              >
                <p className="text-sm font-semibold text-orange-200">
                  {appointment.client_outcome === "satisfied"
                    ? "Cliente confirmou que deu tudo certo"
                    : appointment.client_outcome === "problem_reported"
                      ? "Cliente relatou um problema — revisão necessária"
                      : appointment.client_outcome === "no_show_reported"
                        ? "Cliente relatou não comparecimento — revisão necessária"
                        : "Cliente cancelou o agendamento"}
                </p>

                {appointment.client_outcome_note && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {appointment.client_outcome_note}
                  </p>
                )}

                {appointment.client_reported_at && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Registrado em{" "}
                    {new Date(appointment.client_reported_at).toLocaleString(
                      "pt-BR",
                      { timeZone: "America/Sao_Paulo" },
                    )}
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  O relato não aplica penalidade automaticamente.
                </p>
              </div>
            )}

            <div className="mb-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Cliente
                </p>

                <div className="mt-4 flex items-center gap-4">
                  {clientAvatarUrl ? (
                    <Image
                      src={clientAvatarUrl}
                      alt={
                        client?.full_name
                          ? `Foto de ${client.full_name}`
                          : "Foto do cliente"
                      }
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 shrink-0 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-2xl text-zinc-400">
                      {(client?.full_name || client?.name)
                        ?.trim()
                        ?.charAt(0)
                        ?.toUpperCase() || "C"}
                    </div>
                  )}

                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {client?.full_name ||
                        client?.name ||
                        "Nome do cliente não disponível"}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Cliente que solicitou o atendimento
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Local do atendimento
                </p>
                <h2 className="mt-3 font-semibold text-white">
                  {address?.label || "Local do atendimento"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {addressText(address)}
                </p>

                {destinationUrl && (
                  <a
                    href={destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                  >
                    Abrir rota no Google Maps ↗
                  </a>
                )}

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  A rota usa o endereço cadastrado do atendimento. A localização
                  GPS em tempo real do cliente não é exibida nesta página.
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Serviço solicitado
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {service?.name || service?.title || "Serviço"}
              </h2>

              {(service?.code || service?.service_code) && (
                <p className="mt-1 text-sm text-zinc-500">
                  Código: {service.code || service.service_code}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Horário escolhido pelo cliente
              </p>
              <p className="mt-3 text-xl font-semibold capitalize text-white">
                {formatDateTime(appointment.starts_at)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {formatTime(appointment.starts_at)} às{" "}
                {formatTime(appointment.ends_at)}
              </p>
            </div>

            {appointment.status === "scheduled" && !finished && (
              <>
                <div className="mt-5 rounded-2xl border border-orange-900 bg-orange-950/20 p-5">
                  <p className="text-sm leading-6 text-orange-300">
                    Confira se você poderá atender neste horário e no endereço
                    informado antes de aceitar o chamado.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleDecision("declined")}
                    className="rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-white transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? "Processando..." : "Recusar chamado"}
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleDecision("confirmed")}
                    className="rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? "Processando..." : "Aceitar chamado"}
                  </button>
                </div>
              </>
            )}

            {appointment.status === "confirmed" && (
              <div className="mt-6 rounded-2xl border border-orange-800 bg-orange-950/20 p-5">
                <p className="font-semibold text-orange-400">Chamado aceito</p>
                <p className="mt-2 text-sm leading-6 text-orange-200/80">
                  O agendamento foi confirmado e o cliente será informado.
                </p>
              </div>
            )}

            {finished && (
              <div className="mt-6 rounded-2xl border border-orange-800 bg-orange-950/20 p-5">
                <p className="font-semibold text-orange-400">
                  {appointment.status === "confirmed"
                    ? "Chamado aceito."
                    : "Chamado recusado."}
                </p>
                <p className="mt-2 text-sm text-orange-200/80">
                  Voltando para seus agendamentos...
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600">Profissional: {name}</p>
        </div>
      </section>
    </main>
  );
}
