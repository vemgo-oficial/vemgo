"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Professional = {
  professional_id: string;
  profile_id: string;
  full_name: string;
  profile_status?: string | null;
  identity_status: string;
  verification_status: string;
  service_status: string;
  services_count: number;
  prices_count: number;
  regions_count: number;
  availability_count: number;
};

const verificationLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  verified: "Verificado",
};

const serviceStatusLabels: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

function verificationClass(status: string) {
  if (status === "approved" || status === "verified") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "rejected") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
}

function serviceClass(status: string) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "blocked") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  return "border-zinc-700 bg-zinc-800 text-zinc-400";
}

export default function ControleProfissionaisPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>(
    [],
  );
  const [selected, setSelected] = useState<Professional | null>(
    null,
  );

  const [search, setSearch] = useState("");

  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [listError, setListError] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [listLoaded, setListLoaded] = useState(false);
  const [listNeedsRefresh, setListNeedsRefresh] = useState(false);
  const canApproveSelected =
    selected?.identity_status === "verified" &&
    selected.profile_status === "active";

  const loadProfessionals = useCallback(async (): Promise<boolean> => {
    setLoadingList(true);
    setListError("");
    setDecisionError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: professionalsError } = await supabase.rpc(
        "get_pending_professionals",
      );

      if (professionalsError) {
        setListError(
          `Não foi possível carregar os profissionais: ${professionalsError.message}`,
        );
        return false;
      }

      const nextProfessionals = (data as Professional[]) || [];
      setProfessionals(nextProfessionals);
      setListLoaded(true);
      setListNeedsRefresh(false);

      setSelected((current) =>
        current &&
        !nextProfessionals.some(
          (professional) =>
            professional.professional_id === current.professional_id,
        )
          ? null
          : current,
      );

      return true;
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Erro inesperado.";
      setListError(
        `Não foi possível atualizar a fila. Verifique a conexão e tente novamente. ${detail}`,
      );
      return false;
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
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
        .single();

      if (cancelled) {
        return;
      }

      if (
        profileError ||
        !profile ||
        profile.user_type !== "admin" ||
        profile.status !== "active"
      ) {
        router.replace("/login");
        return;
      }

      setAdminName(profile.full_name || "Administrador");
      setLoading(false);

      await loadProfessionals();
    }

    void loadAdmin();

    return () => {
      cancelled = true;
    };
  }, [loadProfessionals, router]);

  async function handleDecision(
    decision: "approved" | "rejected",
  ) {
    if (!selected || saving) {
      return;
    }

    setDecisionError("");
    setMessage("");

    if (decision === "approved") {
      if (selected.identity_status !== "verified") {
        setDecisionError(
          "Aprovação bloqueada: a identidade precisa estar verificada.",
        );
        return;
      }

      if (selected.profile_status !== "active") {
        setDecisionError(
          selected.profile_status
            ? `Aprovação bloqueada: a conta precisa estar ativa (status atual: ${selected.profile_status}).`
            : "Aprovação bloqueada: o status da conta não foi retornado pela listagem.",
        );
        return;
      }
    }

    if (decision === "rejected" && !rejectionReason.trim()) {
      setDecisionError("Informe o motivo da reprovação.");
      return;
    }

    setSaving(true);
    setListNeedsRefresh(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc(
        "review_professional",
        {
          p_professional_id: selected.professional_id,
          p_decision: decision,
          p_rejection_reason:
            decision === "rejected"
              ? rejectionReason.trim()
              : null,
        },
      );

      if (rpcError) {
        setDecisionError(
          `Não foi possível confirmar a decisão: ${rpcError.message} Atualize a lista antes de tentar outra decisão.`,
        );
        return;
      }

      const refreshed = await loadProfessionals();
      if (refreshed) {
        setMessage(
          decision === "approved"
            ? "Profissional aprovado com sucesso."
            : "Profissional reprovado com sucesso.",
        );
        setSelected(null);
        setRejectionReason("");
      } else {
        setMessage(
          "A decisão foi registrada, mas a fila não pôde ser atualizada. Atualize a lista antes de continuar.",
        );
      }
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Erro inesperado.";
      setDecisionError(
        `Não foi possível confirmar o resultado da decisão. Atualize a lista antes de tentar novamente. ${detail}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  const filteredProfessionals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return professionals.filter(
      (professional) =>
        !normalizedSearch ||
        professional.full_name
          .toLowerCase()
          .includes(normalizedSearch),
    );
  }, [professionals, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            className="mx-auto h-auto w-[150px] object-contain"
            priority
          />

          <p className="mt-6 text-sm text-zinc-500">
            Carregando VemGO Control...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center">
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              className="h-auto w-[170px] object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-zinc-500">
                VemGO Control
              </p>

              <p className="text-sm text-zinc-300">
                Olá,{" "}
                <span className="font-semibold text-white">
                  {adminName}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              VemGO Control
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Profissionais
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Analise os cadastros profissionais e aprove ou
              reprove quem está aguardando validação.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadProfessionals()}
            disabled={loadingList}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingList ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {listError && (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {listError}
          </div>
        )}

        {decisionError && (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {decisionError}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:col-span-1">
            <p className="text-sm text-zinc-500">
              Registros retornados na fila de pendências
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {listLoaded ? professionals.length : "—"}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar entre os profissionais pendentes..."
            className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Cadastros
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Selecione um profissional para analisar.
                </p>
              </div>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                {filteredProfessionals.length}
              </span>
            </div>

            {!listLoaded && loadingList ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-xl bg-zinc-950"
                  />
                ))}
              </div>
            ) : !listLoaded && listError ? (
              <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
                <p className="text-sm font-medium text-red-300">
                  A fila não foi carregada.
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Atualize a lista para tentar novamente. Nenhum resultado foi inferido.
                </p>
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
                <p className="text-sm font-medium text-zinc-400">
                  Nenhum profissional encontrado.
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Ajuste a busca ou atualize a fila de pendências.
                </p>
              </div>
            ) : (
              <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {filteredProfessionals.map((professional) => (
                  <button
                    key={professional.professional_id}
                    type="button"
                    onClick={() => {
                      setSelected(professional);
                      setRejectionReason("");
                      setDecisionError("");
                      setMessage("");
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected?.professional_id ===
                      professional.professional_id
                        ? "border-emerald-500 bg-emerald-950/20"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {professional.full_name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Identidade:{" "}
                          {professional.identity_status ||
                            "unverified"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${verificationClass(
                          professional.verification_status,
                        )}`}
                      >
                        {verificationLabels[
                          professional.verification_status
                        ] ??
                          professional.verification_status}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                      <span>
                        {professional.services_count} serviços
                      </span>

                      <span>
                        {professional.prices_count} preços
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            {!selected ? (
              <div className="flex min-h-[560px] items-center justify-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
                    👤
                  </div>

                  <h2 className="mt-5 text-xl font-semibold text-zinc-200">
                    Selecione um profissional
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Escolha um cadastro na lista para visualizar
                    os dados de validação e tomar uma decisão.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Profissional
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-white">
                      {selected.full_name}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      ID:{" "}
                      <span className="font-mono text-xs text-zinc-600">
                        {selected.professional_id}
                      </span>
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${verificationClass(
                      selected.verification_status,
                    )}`}
                  >
                    {verificationLabels[
                      selected.verification_status
                    ] ??
                      selected.verification_status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs uppercase tracking-wide text-zinc-600">
                      Identidade
                    </p>

                    <p className="mt-2 font-semibold text-white">
                      {selected.identity_status || "Não informado"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs uppercase tracking-wide text-zinc-600">
                      Status da conta
                    </p>

                    <p className="mt-2 font-semibold text-white">
                      {selected.profile_status || "Não retornado"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs uppercase tracking-wide text-zinc-600">
                      Status do serviço
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${serviceClass(
                        selected.service_status,
                      )}`}
                    >
                      {serviceStatusLabels[
                        selected.service_status
                      ] ??
                        selected.service_status}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-white">
                    Completude do cadastro
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-2xl font-bold text-white">
                        {selected.services_count}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        serviços cadastrados
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-2xl font-bold text-white">
                        {selected.prices_count}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        preços cadastrados
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-2xl font-bold text-white">
                        {selected.regions_count}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        regiões cadastradas
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-2xl font-bold text-white">
                        {selected.availability_count}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        períodos configurados
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                  <p className="text-sm font-semibold text-zinc-300">
                    Motivo da reprovação
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Obrigatório somente ao reprovar.
                  </p>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(event.target.value)
                    }
                    placeholder="Ex.: cadastro incompleto, informações divergentes..."
                    className="mt-4 min-h-28 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      void handleDecision("approved")
                    }
                    disabled={saving || listNeedsRefresh || !canApproveSelected}
                    title={
                      canApproveSelected
                        ? "Aprovar somente com identidade verificada e conta ativa."
                        : "A aprovação exige identidade verificada e status da conta ativo retornado pela listagem."
                    }
                    className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Processando..."
                      : canApproveSelected
                        ? "Aprovar profissional"
                        : "Aprovação indisponível"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleDecision("rejected")
                    }
                    disabled={saving || listNeedsRefresh}
                    className="flex-1 rounded-xl border border-red-700 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Processando..."
                      : "Reprovar profissional"}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-300/80">
                  A aprovação exige identidade verificada e conta ativa. Se o
                  status da conta aparecer como “Não retornado”, a RPC ainda
                  não fornece esse campo e a aprovação continuará bloqueada.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
