"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Opportunity = {
  match_id: string;
  request_id: string;
  description: string;
  urgency: string;
  request_status: string;
  service_code: string;
  service_name: string;
  price: number | null;
  city: string;
  state: string;
  neighborhood: string;
  match_score: number;
  match_status: string;
  sent_at: string;
};

type ResponseResult = {
  match_id: string;
  match_status: string;
  request_id: string;
  request_status: string;
  order_id: string | null;
};

export default function OportunidadeDetalhePage() {
  const router = useRouter();
  const params = useParams();

  const matchId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [opportunity, setOpportunity] =
    useState<Opportunity | null>(null);

  const [name, setName] = useState("Profissional");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunity() {
      if (!matchId) {
        setMessage("Oportunidade inválida.");
        setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();

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
          .select("full_name, user_type, status")
          .eq("id", user.id)
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError || !profile) {
        router.replace("/login");
        return;
      }

      if (profile.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (profile.user_type !== "professional") {
        if (profile.user_type === "client") {
          router.replace("/cliente");
        } else if (profile.user_type === "admin") {
          router.replace("/controle");
        } else if (profile.user_type === "company") {
          router.replace("/empresa");
        } else {
          router.replace("/login");
        }

        return;
      }

      setName(profile.full_name || "Profissional");

      const { data, error } = await supabase.rpc(
        "get_professional_opportunities"
      );

      if (cancelled) {
        return;
      }

      if (error) {
        setMessage(
          `Não foi possível carregar a oportunidade: ${error.message}`
        );
        setLoading(false);
        return;
      }

      const opportunities =
        (data || []) as Opportunity[];

      const selected = opportunities.find(
        (item) => item.match_id === matchId
      );

      if (!selected) {
        setMessage(
          "Esta oportunidade não está mais disponível."
        );
        setOpportunity(null);
        setLoading(false);
        return;
      }

      setOpportunity(selected);
      setLoading(false);
    }

    void loadOpportunity();

    return () => {
      cancelled = true;
    };
  }, [matchId, router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  async function handleResponse(
    decision: "accepted" | "declined"
  ) {
    if (!matchId || processing || confirmed) {
      return;
    }

    setMessage("");
    setProcessing(true);

    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.rpc(
      "respond_to_professional_opportunity",
      {
        p_match_id: matchId,
        p_decision: decision,
      }
    );

    if (error) {
      setMessage(
        `Não foi possível responder à oportunidade: ${error.message}`
      );
      setProcessing(false);
      return;
    }

    const result = Array.isArray(data)
      ? (data[0] as ResponseResult | undefined)
      : (data as ResponseResult | null);

    if (!result) {
      setMessage(
        "A resposta foi processada, mas não recebemos os dados do pedido."
      );
      setProcessing(false);
      return;
    }

    if (decision === "declined") {
      router.push("/profissional/oportunidades");
      return;
    }

    setConfirmed(true);
    setOrderId(result.order_id);
    setProcessing(false);
  }

  function formatPrice(price: number | null) {
    if (price === null || price === undefined) {
      return "Preço não informado";
    }

    return price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          Carregando oportunidade...
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
              router.push("/profissional/oportunidades")
            }
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
                <span className="font-semibold text-white">
                  {name}
                </span>
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
        {!confirmed && (
          <button
            type="button"
            onClick={() =>
              router.push("/profissional/oportunidades")
            }
            className="mb-6 text-sm font-semibold text-orange-400 transition hover:text-orange-300"
          >
            ← Voltar para oportunidades
          </button>
        )}

        {confirmed ? (
          <>
            <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 p-8">
              <div className="inline-flex rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-400">
                SERVIÇO CONFIRMADO
              </div>

              <h1 className="mt-5 text-3xl font-bold">
                Serviço aceito com sucesso!
              </h1>

              <p className="mt-3 text-zinc-300">
                Você aceitou esta oportunidade. O pedido foi criado
                e o serviço agora está confirmado para você.
              </p>
            </div>

            {opportunity && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                      {opportunity.service_code}
                    </span>

                    <h2 className="mt-4 text-2xl font-bold">
                      {opportunity.service_name}
                    </h2>

                    <p className="mt-3 text-zinc-300">
                      {opportunity.description}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Valor do serviço
                    </p>

                    <p className="mt-1 text-2xl font-bold text-orange-400">
                      {formatPrice(opportunity.price)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {opportunity && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                  <h2 className="text-lg font-semibold">
                    Local do serviço
                  </h2>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Bairro
                      </p>

                      <p className="mt-1 text-zinc-200">
                        {opportunity.neighborhood}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Cidade
                      </p>

                      <p className="mt-1 text-zinc-200">
                        {opportunity.city}/{opportunity.state}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                  <h2 className="text-lg font-semibold">
                    Pedido
                  </h2>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Status
                      </p>

                      <p className="mt-1 font-semibold text-emerald-400">
                        Confirmado
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Número do pedido
                      </p>

                      <p className="mt-1 break-all text-sm text-zinc-200">
                        {orderId || "Pedido criado"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
              <h2 className="text-lg font-semibold">
                Próximo passo
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Agora que você aceitou o serviço, escolha uma data
                e um horário dentro da sua disponibilidade para
                realizar o atendimento.
              </p>

              <button
                type="button"
                disabled={!orderId}
                onClick={() => {
                  if (!orderId) return;

                  router.push(
                    `/profissional/agendamento/${orderId}`
                  );
                }}
                className="mt-5 w-full rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agendar serviço
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/profissional")
              }
              className="mt-4 w-full rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
            >
              Voltar para meu painel
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-orange-400">
              DETALHES DA OPORTUNIDADE
            </div>

            {message ? (
              <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-6">
                <p className="text-sm text-red-300">
                  {message}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/profissional/oportunidades"
                    )
                  }
                  className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black transition hover:bg-orange-400"
                >
                  Voltar para oportunidades
                </button>
              </div>
            ) : opportunity ? (
              <>
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                          {opportunity.service_code}
                        </span>

                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                          Nova oportunidade
                        </span>
                      </div>

                      <h1 className="mt-4 text-3xl font-bold">
                        {opportunity.service_name}
                      </h1>

                      <p className="mt-4 text-lg text-zinc-300">
                        {opportunity.description}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-4 text-center">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">
                        Valor do serviço
                      </p>

                      <p className="mt-1 text-2xl font-bold text-orange-400">
                        {formatPrice(opportunity.price)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                    <h2 className="text-lg font-semibold">
                      Local do serviço
                    </h2>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Bairro
                        </p>

                        <p className="mt-1 text-zinc-200">
                          {opportunity.neighborhood}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Cidade
                        </p>

                        <p className="mt-1 text-zinc-200">
                          {opportunity.city}/{opportunity.state}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                    <h2 className="text-lg font-semibold">
                      Informações
                    </h2>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Urgência
                        </p>

                        <p className="mt-1 text-zinc-200">
                          {opportunity.urgency === "urgent"
                            ? "Urgente"
                            : "Normal"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Recebida em
                        </p>

                        <p className="mt-1 text-zinc-200">
                          {formatDate(opportunity.sent_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Serviço
                        </p>

                        <p className="mt-1 text-zinc-200">
                          {opportunity.service_code}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-6">
                  <h2 className="text-lg font-semibold">
                    O que acontece agora?
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Esta oportunidade foi enviada porque o seu
                    cadastro possui o serviço solicitado e atende
                    à região informada pelo cliente.
                  </p>

                  <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">
                      Status da oportunidade
                    </p>

                    <p className="mt-1 font-semibold text-orange-400">
                      Aguardando sua resposta
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      handleResponse("accepted")
                    }
                    disabled={processing}
                    className="flex-1 rounded-xl bg-orange-500 px-6 py-4 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing
                      ? "Processando..."
                      : "Aceitar oportunidade"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleResponse("declined")
                    }
                    disabled={processing}
                    className="flex-1 rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing
                      ? "Processando..."
                      : "Recusar oportunidade"}
                  </button>
                </div>

                {message && (
                  <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-center text-sm text-red-300">
                    {message}
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}