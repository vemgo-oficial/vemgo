"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

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
};

type Service = {
  id: string;
  name: string;
  code: string;
};

const onboardingRoutes: Record<number, string> = {
  1: "/cadastro-profissional",
  2: "/cadastro-profissional/endereco",
  3: "/cadastro-profissional/foto",
  4: "/cadastro-profissional/identidade",
  5: "/cadastro-profissional/competencias",
  6: "/cadastro-profissional/precos",
  7: "/cadastro-profissional/disponibilidade",
  8: "/cadastro-profissional/area-atendimento",
  9: "/cadastro-profissional/plano",
};

export default function ProfissionalPage() {
  const router = useRouter();

  const [name, setName] = useState("Profissional");
  const [identityStatus, setIdentityStatus] = useState("unverified");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [serviceStatus, setServiceStatus] = useState("inactive");

  const [pendingAppointments, setPendingAppointments] = useState<
    Appointment[]
  >([]);

  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [services, setServices] = useState<Record<string, Service>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfessional() {
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
        .select(
          "full_name, user_type, status, identity_status, professional_onboarding_step",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profile) {
        router.replace("/login");
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

      if (profile.user_type === "company") {
        router.replace("/empresa");
        return;
      }

      if (profile.user_type !== "professional") {
        router.replace("/login");
        return;
      }

      const onboardingStep =
        profile.professional_onboarding_step ?? 1;

      const onboardingRoute = onboardingRoutes[onboardingStep];

      if (onboardingRoute) {
        router.replace(onboardingRoute);
        return;
      }

      setName(profile.full_name || "Profissional");

      const { data: approvedVerification } = await supabase
        .from("identity_verifications")
        .select("id, status, verification_type, verified_at")
        .eq("profile_id", user.id)
        .eq("status", "approved")
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (
        profile.identity_status === "verified" ||
        approvedVerification?.status === "approved"
      ) {
        setIdentityStatus("verified");
      } else {
        setIdentityStatus(profile.identity_status || "unverified");
      }

      const { data: professional } = await supabase
        .from("professionals")
        .select("verification_status, service_status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (professional) {
        setVerificationStatus(professional.verification_status);
        setServiceStatus(professional.service_status);
      }

      const { data: appointmentData } = await supabase
        .from("appointments")
        .select("id, order_id, starts_at, ends_at, status")
        .eq("professional_id", user.id)
        .eq("status", "scheduled")
        .order("starts_at", { ascending: true });

      if (cancelled) return;

      const appointments = (appointmentData || []) as Appointment[];

      setPendingAppointments(appointments);

      const orderIds = [
        ...new Set(
          appointments.map(
            (appointment) => appointment.order_id,
          ),
        ),
      ];

      if (orderIds.length > 0) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, service_id, price, currency")
          .in("id", orderIds);

        if (cancelled) return;

        const orderMap: Record<string, Order> = {};

        for (const order of (orderData || []) as Order[]) {
          orderMap[order.id] = order;
        }

        setOrders(orderMap);

        const serviceIds = [
          ...new Set(
            (orderData || []).map(
              (order) => order.service_id,
            ),
          ),
        ];

        if (serviceIds.length > 0) {
          const { data: serviceData } = await supabase
            .from("services")
            .select("id, name, code")
            .in("id", serviceIds);

          if (cancelled) return;

          const serviceMap: Record<string, Service> = {};

          for (const service of (serviceData ||
            []) as Service[]) {
            serviceMap[service.id] = service;
          }

          setServices(serviceMap);
        }
      }

      setLoading(false);
    }

    void loadProfessional();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-zinc-400">
            Carregando sua área profissional…
          </p>
        </div>
      </main>
    );
  }

  const identityLabel =
    identityStatus === "verified"
      ? "Verificada"
      : identityStatus === "pending"
        ? "Em análise"
        : identityStatus === "rejected"
          ? "Rejeitada"
          : "Não verificada";

  const professionalVerificationLabel =
    verificationStatus === "approved"
      ? "Aprovado"
      : verificationStatus === "rejected"
        ? "Rejeitado"
        : verificationStatus === "under_review"
          ? "Em análise"
          : "Aguardando validação";

  const serviceStatusLabel =
    serviceStatus === "active"
      ? "Ativo"
      : serviceStatus === "paused"
        ? "Pausado"
        : "Inativo";

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR", {
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

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-white/10 bg-surface-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Image
            src="/logo-vemgo.png"
            alt="VemGO"
            width={190}
            height={64}
            priority
            unoptimized
          />

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-text-tertiary">
                Área do profissional
              </div>

              <div className="text-sm text-text-secondary">
                Olá,{" "}
                <span className="font-semibold text-text-primary">
                  {name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-11 rounded-md border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:border-vemgo-orange hover:text-vemgo-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="inline-flex rounded-full border border-vemgo-orange-border bg-vemgo-orange-soft px-4 py-2 text-xs font-semibold tracking-wide text-vemgo-orange">
          VEMGO PROFISSIONAL
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight">
          Bem-vindo à VemGO
        </h1>

        <p className="mt-2 text-text-secondary">
          Gerencie seus serviços, agenda e oportunidades.
        </p>

        {pendingAppointments.length > 0 && (
          <section className="mt-8">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/profissional/agendamento/${pendingAppointments[0].order_id}`,
                )
              }
              className="w-full rounded-2xl border border-vemgo-orange bg-vemgo-orange-soft p-6 text-left transition-colors hover:bg-vemgo-orange/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-vemgo-orange px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black">
                    <span className="h-2 w-2 rounded-full bg-black" />
                    Nova solicitação
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-white">
                    Solicitação de agendamento
                  </h2>

                  <p className="mt-1 text-text-secondary">
                    {pendingAppointments.length === 1
                      ? "Um cliente escolheu um horário e aguarda sua confirmação."
                      : `${pendingAppointments.length} clientes aguardam sua confirmação.`}
                  </p>
                </div>

                <div className="shrink-0 rounded-md bg-vemgo-orange px-5 py-3 text-center font-bold text-black">
                  Ver solicitação →
                </div>
              </div>

              {(() => {
                const appointment = pendingAppointments[0];
                const order = orders[appointment.order_id];
                const service = order
                  ? services[order.service_id]
                  : undefined;

                return (
                  <div className="mt-6 grid gap-4 border-t border-vemgo-orange/20 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-vemgo-orange/70">
                        Serviço
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {service?.name || "Serviço VemGO"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-vemgo-orange/70">
                        Horário solicitado
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {formatDate(appointment.starts_at)}
                      </p>

                      <p className="text-sm font-bold text-vemgo-orange">
                        {formatTime(appointment.starts_at)} às{" "}
                        {formatTime(appointment.ends_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-vemgo-orange/70">
                        Valor
                      </p>

                      <p className="mt-1 text-xl font-bold text-white">
                        {order
                          ? formatPrice(Number(order.price))
                          : "—"}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {pendingAppointments.length > 1 && (
                <div className="mt-5 border-t border-vemgo-orange/20 pt-4">
                  <p className="text-sm font-semibold text-vemgo-orange">
                    + {pendingAppointments.length - 1}{" "}
                    {pendingAppointments.length - 1 === 1
                      ? "outra solicitação"
                      : "outras solicitações"}{" "}
                    aguardando resposta
                  </p>
                </div>
              )}
            </button>
          </section>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
            <p className="text-sm text-text-tertiary">
              Identidade
            </p>

            <p className="mt-2 font-semibold">
              {identityLabel}
            </p>

            {identityStatus !== "verified" && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/cadastro-profissional/identidade",
                  )
                }
                className="mt-4 min-h-11 text-sm font-semibold text-vemgo-orange transition-colors hover:text-vemgo-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
              >
                Verificação de identidade →
              </button>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
            <p className="text-sm text-text-tertiary">
              Cadastro profissional
            </p>

            <p className="mt-2 font-semibold">
              {professionalVerificationLabel}
            </p>

            {verificationStatus !== "approved" && (
              <button
                type="button"
                onClick={() =>
                  router.push("/profissional/servicos")
                }
                className="mt-4 min-h-11 text-sm font-semibold text-vemgo-orange transition-colors hover:text-vemgo-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
              >
                Cadastrar serviços →
              </button>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
            <p className="text-sm text-text-tertiary">
              Status para serviços
            </p>

            <p className="mt-2 font-semibold">
              {serviceStatusLabel}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">
            Meu cadastro
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <button
              type="button"
              onClick={() =>
                router.push("/profissional/servicos")
              }
              className="rounded-xl border border-white/10 bg-surface-1 p-5 text-left transition-colors hover:border-vemgo-orange/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <p className="font-semibold text-white">
                Serviços
              </p>

              <p className="mt-2 text-sm text-text-tertiary">
                Gerencie suas competências.
              </p>

              <p className="mt-4 text-sm font-semibold text-vemgo-orange">
                Gerenciar →
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/profissional/precos")
              }
              className="rounded-xl border border-white/10 bg-surface-1 p-5 text-left transition-colors hover:border-vemgo-orange/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <p className="font-semibold text-white">
                Preços
              </p>

              <p className="mt-2 text-sm text-text-tertiary">
                Defina os preços dos seus serviços.
              </p>

              <p className="mt-4 text-sm font-semibold text-vemgo-orange">
                Gerenciar →
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/profissional/regioes")
              }
              className="rounded-xl border border-white/10 bg-surface-1 p-5 text-left transition-colors hover:border-vemgo-orange/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <p className="font-semibold text-white">
                Regiões
              </p>

              <p className="mt-2 text-sm text-text-tertiary">
                Defina onde você atende.
              </p>

              <p className="mt-4 text-sm font-semibold text-vemgo-orange">
                Gerenciar →
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profissional/disponibilidade",
                )
              }
              className="rounded-xl border border-white/10 bg-surface-1 p-5 text-left transition-colors hover:border-vemgo-orange/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <p className="font-semibold text-white">
                Disponibilidade
              </p>

              <p className="mt-2 text-sm text-text-tertiary">
                Informe seus dias e horários.
              </p>

              <p className="mt-4 text-sm font-semibold text-vemgo-orange">
                Gerenciar →
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/profissional/agendamento")
              }
              className="rounded-xl border border-white/10 bg-surface-1 p-5 text-left transition-colors hover:border-vemgo-orange/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vemgo-orange"
            >
              <p className="font-semibold text-white">
                Agendamento
              </p>

              <p className="mt-2 text-sm text-text-tertiary">
                Gerencie solicitações e serviços agendados.
              </p>

              <p className="mt-4 text-sm font-semibold text-vemgo-orange">
                Acessar →
              </p>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}