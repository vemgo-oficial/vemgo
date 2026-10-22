"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAccessibleDrawer, useDrawerInteractions } from "@/components/vemgo/useAccessibleDrawer";
import { PortalHeaderBar, PortalNavigationDrawer } from "@/components/vemgo/PortalLayout";
import ProfessionalLiveLocation from "@/components/vemgo/ProfessionalLiveLocation";
import {
  getProfessionalOnboardingRoute,
  PROFESSIONAL_ONBOARDING_COMPLETED_STEP,
} from "@/lib/professional-onboarding";

type Appointment = {
  id: string;
  order_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

type Order = {
  id: string;
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

type Profile = {
  full_name: string | null;
  avatar_url?: string | null;
  user_type: string;
  status: string;
  identity_status: string | null;
  professional_onboarding_step: number | null;
};

type Professional = {
  verification_status: string | null;
  service_status: string | null;
  is_accepting_calls: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "confirmed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "in_progress") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-400";
  }

  if (status === "completed") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  }

  if (status === "cancelled" || status === "no_show") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

export default function ProfissionalPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  const [opportunityCount, setOpportunityCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "tracking" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuInteractions = useDrawerInteractions(menuOpen, setMenuOpen);
  const menuDialogRef = useAccessibleDrawer(menuOpen, setMenuOpen, menuButtonRef, menuInteractions.focusOnOpen, menuInteractions.clearFocus);
  const plansSectionRef = useRef<HTMLElement | null>(null);
  const [plansAnimationStarted, setPlansAnimationStarted] = useState(false);
  const [activePlan, setActivePlan] = useState("Bronze");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    // Dispara a sequência depois da primeira pintura, para que o navegador
    // tenha um estado inicial real (cards fora da posição final) para animar.
    const frameId = window.requestAnimationFrame(() => {
      setPlansAnimationStarted(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const loadProfessional = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?role=professional");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url, user_type, status, identity_status, professional_onboarding_step",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(
          `Não foi possível carregar seu perfil: ${profileError?.message ?? "perfil não encontrado"}`,
        );
        return;
      }

      const currentProfile = profileData as Profile;

      // O banco guarda o caminho do arquivo. Como o bucket é privado,
      // criamos uma URL assinada temporária para exibir a foto.
      setAvatarUrl(null);
      if (currentProfile.avatar_url) {
        const storedAvatar = currentProfile.avatar_url;
        if (storedAvatar.startsWith("https://") || storedAvatar.startsWith("http://")) {
          setAvatarUrl(storedAvatar);
        } else {
          const { data: signedImage, error: imageError } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(storedAvatar, 3600);

          if (!imageError && signedImage?.signedUrl) {
            setAvatarUrl(signedImage.signedUrl);
          }
        }
      }

      if (currentProfile.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (currentProfile.user_type === "client") {
        router.replace("/cliente");
        return;
      }

      if (currentProfile.user_type === "admin") {
        router.replace("/controle");
        return;
      }

      if (currentProfile.user_type === "company") {
        setError(
          "Contas empresariais ainda não estão disponíveis nesta versão da VemGO.",
        );
        return;
      }

      if (currentProfile.user_type !== "professional") {
        router.replace("/login");
        return;
      }

      const onboardingStep =
        currentProfile.professional_onboarding_step ?? 1;

      if (onboardingStep < PROFESSIONAL_ONBOARDING_COMPLETED_STEP) {
        router.replace(getProfessionalOnboardingRoute(onboardingStep));
        return;
      }

      setProfile(currentProfile);

      const [
        { data: professionalData, error: professionalError },
        { data: appointmentData, error: appointmentError },
      ] = await Promise.all([
        supabase
          .from("professionals")
          .select(
            "verification_status, service_status, is_accepting_calls",
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("appointments")
          .select("id, order_id, starts_at, ends_at, status")
          .eq("professional_id", user.id)
          .order("starts_at", { ascending: true }),
      ]);

      if (professionalError) {
        setError(
          `Não foi possível carregar o status profissional: ${professionalError.message}`,
        );
        return;
      }

      if (appointmentError) {
        setError(
          `Não foi possível carregar seus agendamentos: ${appointmentError.message}`,
        );
        return;
      }

      const currentProfessional = professionalData as Professional | null;
      setProfessional(currentProfessional);

      // Só consulta oportunidades quando o perfil está liberado e ON.
      const canReceiveCalls =
        currentProfile.identity_status === "verified" &&
        currentProfessional?.verification_status === "approved" &&
        currentProfessional?.service_status === "active" &&
        currentProfessional?.is_accepting_calls === true;

      if (canReceiveCalls) {
        const { data: opportunityData, error: opportunityError } =
          await supabase.rpc("get_professional_opportunities");

        if (opportunityError) {
          setError(
            `Não foi possível carregar oportunidades: ${opportunityError.message}`,
          );
        } else {
          setOpportunityCount(
            (opportunityData ?? []).filter(
              (item: { match_status?: string }) =>
                item.match_status === "sent" ||
                item.match_status === "pending",
            ).length,
          );
        }
      } else {
        setOpportunityCount(0);
      }

      const appointmentRows = (appointmentData ?? []) as Appointment[];
      setAppointments(appointmentRows);

      const orderIds = Array.from(
        new Set(appointmentRows.map((item) => item.order_id)),
      );

      if (orderIds.length > 0) {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, service_id, price, currency, status")
          .in("id", orderIds);

        if (orderError) {
          setError(
            `Não foi possível carregar os serviços agendados: ${orderError.message}`,
          );
          return;
        }

        const orderMap: Record<string, Order> = {};

        for (const order of (orderData ?? []) as Order[]) {
          orderMap[order.id] = order;
        }

        setOrders(orderMap);

        const serviceIds = Array.from(
          new Set(
            (orderData ?? []).map((order) => order.service_id),
          ),
        );

        if (serviceIds.length > 0) {
          const { data: serviceData, error: serviceError } = await supabase
            .from("services")
            .select("id, name, code")
            .in("id", serviceIds);

          if (serviceError) {
            setError(
              `Não foi possível carregar os dados dos serviços: ${serviceError.message}`,
            );
            return;
          }

          const serviceMap: Record<string, Service> = {};

          for (const service of (serviceData ?? []) as Service[]) {
            serviceMap[service.id] = service;
          }

          setServices(serviceMap);
        } else {
          setServices({});
        }
      } else {
        setOrders({});
        setServices({});
      }
    } catch {
      setError("Ocorreu um erro inesperado ao carregar sua área profissional.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfessional();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProfessional]);

  const pendingAppointmentCount = appointments.filter(
    (appointment) => appointment.status === "scheduled",
  ).length;

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "confirmed" ||
      appointment.status === "in_progress",
  );

  const historyAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "completed" ||
      appointment.status === "cancelled" ||
      appointment.status === "no_show",
  );

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || "Profissional";

  const identityVerified = profile?.identity_status === "verified";
  const approved = professional?.verification_status === "approved";
  const servicesActive = professional?.service_status === "active";

  const canManageAvailability =
    identityVerified && approved && servicesActive;

  const isAcceptingCalls =
    canManageAvailability && professional?.is_accepting_calls === true;

  let approvalTitle = "Seu cadastro está em análise";
  let approvalDescription =
    "Recebemos seu cadastro. Nossa equipe precisa verificar seus dados antes de liberar o recebimento de chamados.";

  if (profile?.identity_status === "rejected") {
    approvalTitle = "Precisamos revisar sua identidade";
    approvalDescription =
      "Sua identidade não foi aprovada. Consulte as orientações da equipe para corrigir o cadastro.";
  } else if (!identityVerified) {
    approvalTitle = "Aguardando verificação de identidade";
    approvalDescription =
      "O recebimento de chamados ficará indisponível até a verificação da sua identidade.";
  } else if (!approved) {
    approvalTitle = "Cadastro aguardando aprovação";
    approvalDescription =
      "Sua identidade foi verificada. Agora, seu cadastro precisa ser aprovado pela equipe VemGO.";
  } else if (!servicesActive) {
    approvalTitle = "Aguardando ativação dos serviços";
    approvalDescription =
      "Seu cadastro foi aprovado, mas a equipe ainda precisa ativar seus serviços.";
  } else if (isAcceptingCalls) {
    approvalTitle = "Você está disponível para receber chamados";
    approvalDescription =
      "Sua disponibilidade está ON. Você poderá receber oportunidades compatíveis com seus serviços, região e horários.";
  } else {
    approvalTitle = "Seu perfil está habilitado";
    approvalDescription =
      "Ative sua disponibilidade quando estiver pronto para receber novos chamados.";
  }

  async function toggleAvailability() {
    if (savingAvailability || !canManageAvailability || !professional) {
      return;
    }

    setSavingAvailability(true);
    setError("");
    setAvailabilityMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?role=professional");
        return;
      }

      const nextValue = !professional.is_accepting_calls;

      const { data, error: updateError } = await supabase
        .from("professionals")
        .update({ is_accepting_calls: nextValue })
        .eq("id", user.id)
        .eq("verification_status", "approved")
        .eq("service_status", "active")
        .select("verification_status, service_status, is_accepting_calls")
        .maybeSingle();

      if (updateError) {
        setError(
          `Não foi possível alterar sua disponibilidade: ${updateError.message}`,
        );
        return;
      }

      if (!data) {
        setError(
          "A disponibilidade não foi alterada. Confirme se sua conta está aprovada e se as permissões de atualização do Supabase permitem essa operação.",
        );
        return;
      }

      const updatedProfessional = data as Professional;

      if (
        updatedProfessional.verification_status !== "approved" ||
        updatedProfessional.service_status !== "active"
      ) {
        setError(
          "Sua conta não está habilitada para alterar a disponibilidade.",
        );
        return;
      }

      setProfessional(updatedProfessional);
      setAvailabilityMessage(
        updatedProfessional.is_accepting_calls
          ? "Você está ON e disponível para receber novos chamados."
          : "Você está OFF e pausou o recebimento de novos chamados.",
      );

      if (!updatedProfessional.is_accepting_calls) {
        setOpportunityCount(0);
      } else {
        const { data: opportunities, error: opportunitiesError } =
          await supabase.rpc("get_professional_opportunities");

        if (opportunitiesError) {
          setError(
            `Disponibilidade ativada, mas não foi possível atualizar as oportunidades: ${opportunitiesError.message}`,
          );
        } else {
          setOpportunityCount(
            (opportunities ?? []).filter(
              (item: { match_status?: string }) =>
                item.match_status === "sent" ||
                item.match_status === "pending",
            ).length,
          );
        }
      }
    } catch {
      setError("Ocorreu um erro inesperado ao alterar sua disponibilidade.");
    } finally {
      setSavingAvailability(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#070707] text-zinc-100">
      <PortalHeaderBar role="professional" menuOpen={menuOpen} menuButtonRef={menuButtonRef} interactions={menuInteractions}>
          <div
            role="status"
            aria-live="polite"
            title={gpsStatus === "tracking" ? "GPS confirmado e atualizado" : "GPS indisponível; usar localização cadastrada"}
            className={`ml-1 hidden shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left sm:flex ${
              gpsStatus === "tracking"
                ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                : "border-white/10 bg-white/[0.035]"
            }`}
          >
            <span className={gpsStatus === "tracking" ? "text-emerald-400" : "text-zinc-500"} aria-hidden="true">⌖</span>
            <span>
              <span className={`block text-xs font-semibold ${gpsStatus === "tracking" ? "text-emerald-300" : "text-zinc-300"}`}>
                {gpsStatus === "tracking" ? "GPS ativo" : "GPS indisponível"}
              </span>
              <span className="block text-[10px] text-zinc-500">
                {gpsStatus === "tracking" ? "Localização confirmada" : "Usando cadastro"}
              </span>
            </span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button type="button" role="switch" aria-checked={isAcceptingCalls} aria-label="Disponibilidade para receber chamados" onClick={toggleAvailability} disabled={!canManageAvailability || savingAvailability} className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex ${isAcceptingCalls ? "border-orange-400/40 bg-orange-400/10 text-orange-300" : "border-white/10 bg-white/[0.035] text-zinc-400"}`}>
              <span className={`h-2 w-2 rounded-full ${isAcceptingCalls ? "bg-orange-400" : "bg-zinc-500"}`}/>{isAcceptingCalls ? "Disponível" : "Indisponível"}
            </button>
            <button type="button" onClick={() => router.push("/profissional/recurso-indisponivel/vemgo-pay")} aria-label="Abrir informações do VemGO Pay" title="VemGO Pay" className="hidden shrink-0 items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/[0.07] px-3 py-2 text-left transition hover:border-orange-400/50 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-400/15 font-bold text-orange-300">$</span>
              <span><span className="block text-xs font-bold text-white">VemGO Pay</span><span className="block text-[10px] text-zinc-400">Recebimentos</span></span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notificações" aria-expanded={notificationsOpen} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-white/5 hover:text-orange-400">
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {opportunityCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#080b0a]"/>}
              </button>
              {notificationsOpen && <div className="absolute right-0 top-12 z-[70] w-[min(300px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#111512] p-4 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-semibold">Notificações</h3><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Fechar notificações" className="text-zinc-500 hover:text-white">×</button></div><p className="mt-3 text-sm leading-6 text-zinc-400">{opportunityCount > 0 ? `Você tem ${opportunityCount} oportunidade(s) compatíveis.` : "Suas atualizações aparecerão aqui quando houver novidades."}</p><button type="button" onClick={() => { setNotificationsOpen(false); router.push("/profissional/oportunidades"); }} className="mt-3 text-sm font-semibold text-orange-400 hover:text-orange-300">Ver oportunidades →</button></div>}
            </div>
            <button type="button" onClick={() => router.push("/profissional/perfil")} className="flex shrink-0 items-center gap-2 rounded-xl py-1 pl-1 text-left transition hover:bg-white/[0.035] sm:gap-3 sm:pl-2 sm:pr-2">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900">{avatarUrl ? <Image src={avatarUrl} alt={`Foto de ${firstName}`} width={40} height={40} unoptimized className="h-full w-full object-cover"/> : <span className="font-bold text-orange-400">{firstName.charAt(0).toUpperCase()}</span>}</span>
              <span className="hidden max-w-[135px] sm:block"><span className="block truncate text-sm font-semibold">Olá, {firstName}!</span><span className="block text-xs text-zinc-500">Profissional</span></span>
            </button>
            <button type="button" onClick={async () => { const supabase = createSupabaseBrowserClient(); await supabase.auth.signOut(); router.replace("/login?role=professional"); }} aria-label="Sair da conta" title="Sair" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
      </PortalHeaderBar>
      <PortalNavigationDrawer role="professional" open={menuOpen} onClose={() => { menuInteractions.clearFocus(); setMenuOpen(false); }} menuRef={menuDialogRef} interactions={menuInteractions} />

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="h-56 animate-pulse rounded-2xl bg-zinc-900" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-zinc-900" />)}
            </div>
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b130c] via-[#111111] to-[#0b0b0b] p-6 shadow-2xl sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-400">Seu trabalho, no seu ritmo</p>
                  <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    Pronto para <span className="text-orange-400">novos serviços?</span>
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
                    Mantenha seu perfil atualizado e sua disponibilidade ativa para receber oportunidades compatíveis com seus serviços.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => router.push("/profissional/agendamento")} className="inline-flex items-center justify-center gap-3 rounded-xl bg-orange-500 px-5 py-3 font-bold text-black shadow-lg shadow-orange-950/30 transition hover:bg-orange-400">
                      Minha agenda <span aria-hidden="true">→</span>
                    </button>
                    <button type="button" onClick={() => router.push("/profissional/oportunidades")} disabled={!canManageAvailability} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white transition hover:border-orange-400/50 disabled:cursor-not-allowed disabled:opacity-50">
                      Ver oportunidades
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">◇</span>
                      <div>
                        <p className="font-semibold text-white">{approvalTitle}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">{approvalDescription}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Receber chamados</p>
                        <p className={`mt-1 text-xs font-semibold ${isAcceptingCalls ? "text-orange-300" : "text-zinc-400"}`}>{isAcceptingCalls ? "ON · Disponível" : "OFF · Pausado"}</p>
                      </div>
                      {canManageAvailability ? (
                        <button type="button" role="switch" aria-checked={isAcceptingCalls} aria-label="Ativar ou pausar recebimento de chamados" onClick={toggleAvailability} disabled={savingAvailability} className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${isAcceptingCalls ? "bg-orange-500" : "bg-zinc-700"}`}>
                          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${isAcceptingCalls ? "left-7" : "left-1"}`} />
                        </button>
                      ) : <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">Bloqueado</span>}
                    </div>
                    {savingAvailability && <p className="mt-3 text-xs text-zinc-500">Salvando disponibilidade...</p>}
                  </div>
                </div>
              </div>
              {availabilityMessage && <p role="status" className="relative mt-5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm text-orange-200">{availabilityMessage}</p>}
            </section>

            <ProfessionalLiveLocation enabled={isAcceptingCalls} onStatusChange={setGpsStatus} />

            <section ref={plansSectionRef} className={`mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 sm:p-8 ${plansAnimationStarted ? "plans-visible" : "plans-not-yet-visible"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Cresça com a VemGO</p>
                  <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Planos VemGO para profissionais</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Mais visibilidade para apresentar seu trabalho e ampliar suas oportunidades.</p>
                </div>
                <button type="button" onClick={() => router.push("/profissional/recurso-indisponivel/planos")} className="mt-3 inline-flex shrink-0 items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 sm:mt-0">Conhecer planos →</button>
              </div>
              <style>{`
                @keyframes vemgoStackEnter { from { opacity: 0; transform: translateX(-55px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
                @keyframes vemgoStackReveal { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .plans-not-yet-visible .vemgo-plan-stack-card { opacity: 0; }
                .plans-visible .vemgo-plan-stack-card { animation: vemgoStackEnter 650ms cubic-bezier(.2,.75,.25,1) both; }
                .plans-visible .vemgo-plan-stack-card:nth-child(1) { animation-delay: 100ms; }
                .plans-visible .vemgo-plan-stack-card:nth-child(2) { animation-delay: 300ms; }
                .plans-visible .vemgo-plan-stack-card:nth-child(3) { animation-delay: 500ms; }
                .plans-visible .vemgo-plan-details { animation: vemgoStackReveal 450ms ease-out both; }
                @media (prefers-reduced-motion: reduce) { .plans-visible .vemgo-plan-stack-card, .plans-visible .vemgo-plan-details { animation: none; opacity: 1; transform: none; } }
              `}</style>
              {(() => {
                const plans = [
                  { name: "Bronze", eyebrow: "PRIMEIROS PASSOS", border: "border-[#a87950]", accent: "text-[#d6a77e]", description: "Para começar a ampliar sua presença na plataforma.", badge: "BRONZE", frame: "#a87950" },
                  { name: "Prata", eyebrow: "MAIS VISIBILIDADE", border: "border-[#c7cbd1]", accent: "text-[#e1e4e8]", description: "Para fortalecer sua presença e alcançar novas oportunidades.", badge: "PRATA", frame: "#c7cbd1" },
                  { name: "Ouro", eyebrow: "DESTAQUE PREMIUM", border: "border-[#d4ad48]", accent: "text-[#f2ce6c]", description: "Para quem busca ampliar ainda mais sua exposição.", badge: "OURO", frame: "#d4ad48" },
                ];
                const selected = plans.find((plan) => plan.name === activePlan) ?? plans[0];
                const inactive = plans.filter((plan) => plan.name !== selected.name);
                const visibleCards = [...inactive, selected];
                return (
                  <div className="mt-7 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.9fr)]">
                    <div key={selected.name} className="vemgo-plan-details min-w-0" aria-live="polite">
                      <p className={`text-xs font-bold uppercase tracking-[0.24em] ${selected.accent}`}>{selected.eyebrow}</p>
                      <h3 className="mt-3 text-3xl font-black text-white sm:text-4xl">Plano {selected.name}</h3>
                      <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-300">{selected.description}</p>
                      <p className="mt-5 text-sm leading-6 text-zinc-500">Selecione outra carta para conhecer esse plano.</p>
                      <button type="button" onClick={() => router.push("/profissional/recurso-indisponivel/planos")} className={`mt-6 inline-flex items-center gap-2 rounded-xl border ${selected.border} bg-white/[0.03] px-5 py-3 text-sm font-bold ${selected.accent} transition hover:bg-white/[0.07]`}>Conhecer plano {selected.name} <span aria-hidden="true">→</span></button>
                    </div>
                    <div className="relative mx-auto h-[330px] w-full max-w-[390px] sm:h-[360px]" aria-label="Cartas dos planos VemGO; selecione uma carta para trazê-la para frente">
                      {visibleCards.map((plan) => {
                        const isActive = plan.name === selected.name;
                        const inactiveIndex = inactive.findIndex((item) => item.name === plan.name);
                        const left = isActive ? 76 : inactiveIndex === 0 ? 0 : 36;
                        const zIndex = isActive ? 10 : inactiveIndex + 1;
                        return (
                          <button
                            key={plan.name}
                            type="button"
                            onClick={() => setActivePlan(plan.name)}
                            aria-pressed={isActive}
                            aria-label={`Selecionar plano ${plan.name}`}
                            title={isActive ? `Plano ${plan.name} selecionado` : `Trazer plano ${plan.name} para frente`}
                            className={`vemgo-plan-stack-card absolute top-0 h-[310px] w-[min(72%,270px)] overflow-hidden rounded-[22px] border-2 bg-[#111111] text-left shadow-2xl transition-[left,transform,box-shadow,border-color] duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:h-[340px] ${plan.border} ${isActive ? "cursor-default" : "cursor-pointer hover:-translate-y-1"}`}
                            style={{ left: `${left}px`, zIndex, borderColor: plan.frame, transform: isActive ? "translateX(0) rotate(0deg) scale(1)" : `rotate(${inactiveIndex === 0 ? -5 : -2}deg) scale(${inactiveIndex === 0 ? 0.94 : 0.97})`, transformOrigin: "bottom center" }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/60" />
                            <div className="absolute inset-[7px] overflow-hidden rounded-[15px] border border-white/10 bg-black">
                              <Image src="/images/profissional-vemgo-card.png" alt={`Profissional VemGO — Plano ${plan.name}`} fill unoptimized sizes="(max-width: 640px) 70vw, 270px" className="object-cover object-[center_30%]" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/5" />
                            </div>
                            <span className={`absolute bottom-5 left-5 rounded-full border bg-black/85 px-3 py-1 text-[11px] font-extrabold tracking-[0.18em] ${plan.border} ${plan.accent}`}>{plan.badge}</span>
                            {!isActive && <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/65 to-transparent" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <p className="mt-5 text-xs leading-5 text-zinc-500">Os planos e benefícios são apresentados como proposta visual; os detalhes comerciais serão confirmados antes de qualquer contratação.</p>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={() => router.push("/profissional/oportunidades")} disabled={!canManageAvailability} className="group rounded-2xl border border-white/10 bg-[#111111] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-400/40 disabled:cursor-not-allowed disabled:opacity-50">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">▤</span><span className="text-zinc-600 transition group-hover:text-orange-400">↗</span></div>
                <p className="mt-5 text-sm text-zinc-400">Oportunidades</p>
                <p className="mt-1 text-3xl font-black text-white">{canManageAvailability ? opportunityCount : "—"}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{canManageAvailability ? "Chamados compatíveis disponíveis" : "Disponível após a aprovação"}</p>
              </button>
              <button type="button" onClick={() => router.push("/profissional/agendamento")} className="group rounded-2xl border border-white/10 bg-[#111111] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-400/40">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">▣</span><span className="text-zinc-600 transition group-hover:text-orange-400">↗</span></div>
                <p className="mt-5 text-sm text-zinc-400">Próximos compromissos</p>
                <p className="mt-1 text-3xl font-black text-white">{upcomingAppointments.length}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{pendingAppointmentCount} agendado(s) · serviços confirmados ou em andamento</p>
              </button>
              <button type="button" onClick={() => router.push("/profissional/agendamento")} className="group rounded-2xl border border-white/10 bg-[#111111] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-400/40">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">✓</span><span className="text-zinc-600 transition group-hover:text-orange-400">↗</span></div>
                <p className="mt-5 text-sm text-zinc-400">Histórico</p>
                <p className="mt-1 text-3xl font-black text-white">{historyAppointments.length}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Serviços encerrados</p>
              </button>
              <button type="button" onClick={() => router.push("/profissional/precos")} className="group rounded-2xl border border-white/10 bg-[#111111] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-400/40">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">R$</span><span className="text-zinc-600 transition group-hover:text-orange-400">↗</span></div>
                <p className="mt-5 text-sm text-zinc-400">Meus preços</p>
                <p className="mt-1 text-lg font-bold text-white">Gerenciar</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Consulte e atualize seus preços</p>
              </button>
            </section>

            <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Sua rotina</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Próximos agendamentos</h2>
                    <p className="mt-1 text-sm text-zinc-500">Acompanhe os serviços aceitos e seus compromissos.</p>
                  </div>
                  <button type="button" onClick={() => router.push("/profissional/agendamento")} className="shrink-0 text-sm font-semibold text-orange-400 hover:text-orange-300">Ver todos →</button>
                </div>
                {upcomingAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#101010] px-6 py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl text-orange-400">▣</div>
                    <h3 className="mt-4 font-semibold text-white">Nenhum agendamento próximo</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Quando houver serviços confirmados ou em andamento, eles aparecerão aqui.</p>
                    <button type="button" onClick={() => router.push("/profissional/oportunidades")} disabled={!canManageAvailability} className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">Ver oportunidades</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.slice(0, 5).map((appointment) => {
                      const order = orders[appointment.order_id];
                      const service = order ? services[order.service_id] : undefined;
                      return (
                        <button key={appointment.id} type="button" onClick={() => router.push(`/profissional/agendamento/${appointment.order_id}`)} className="w-full rounded-2xl border border-white/10 bg-[#111111] p-4 text-left transition hover:border-orange-400/40 sm:p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{service?.name ?? "Serviço agendado"}</p>
                              {service?.code && <p className="mt-1 text-xs font-semibold text-orange-400">{service.code}</p>}
                              <p className="mt-3 text-sm text-zinc-400">{formatDate(appointment.starts_at)} · {formatTime(appointment.starts_at)} às {formatTime(appointment.ends_at)}</p>
                            </div>
                            <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                              {order && <span className="text-lg font-bold text-white">{formatPrice(Number(order.price), order.currency)}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside>
                <div className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-500/10 via-[#111111] to-[#111111] p-6 sm:p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 9h8M8 12h5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Estamos aqui para ajudar</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Precisa de ajuda?</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">Fale com o suporte da VemGO para tirar dúvidas sobre sua conta, seus serviços ou recebimentos.</p>
                  <button type="button" onClick={() => router.push("/profissional/recurso-indisponivel/ajuda")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400">Solicitar ajuda <span aria-hidden="true">→</span></button>
                </div>
              </aside>
            </div>
          </>
        )}
        <section className="mt-8 rounded-3xl border border-orange-500/20 bg-gradient-to-r from-[#24170c] via-[#111111] to-[#17100a] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-xl font-bold text-orange-300">$</span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Recebimentos na VemGO</p><h2 className="mt-2 text-2xl font-bold text-white">Conheça o VemGO Pay</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Acompanhe as informações sobre seus recebimentos e a movimentação financeira pela plataforma.</p></div></div>
            <button type="button" onClick={() => router.push("/profissional/recurso-indisponivel/vemgo-pay")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-400/30 px-5 py-3 text-sm font-bold text-orange-300 transition hover:bg-orange-400/10">Ver informações do VemGO Pay →</button>
          </div>
        </section>
        <footer className="mt-8 border-t border-white/10 py-6 text-center">
          <p className="text-xs text-zinc-500">VemGO — Serviço rápido. Preço certo. Chama que vem!</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
            <button type="button" onClick={() => router.push("/privacidade")} className="transition hover:text-zinc-300">Privacidade</button>
            <button type="button" onClick={() => router.push("/termos-profissional")} className="transition hover:text-zinc-300">Termos do profissional</button>
          </div>
        </footer>
      </div>
    </main>
  );
}
