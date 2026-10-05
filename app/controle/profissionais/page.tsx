"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Professional = {
  professional_id: string;
  profile_id: string;
  full_name: string;
  identity_status: string;
  verification_status: string;
  service_status: string;
  services_count: number;
  prices_count: number;
  regions_count: number;
  availability_count: number;
};

export default function ControleProfissionaisPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<Professional | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProfessionals() {
    setLoadingList(true);
    setError("");

    const supabase = createSupabaseBrowserClient();

    const { data, error: professionalsError } =
      await supabase.rpc("get_pending_professionals");

    if (professionalsError) {
      setError(
        `Não foi possível carregar os profissionais: ${professionalsError.message}`,
      );
      setLoadingList(false);
      return;
    }

    setProfessionals((data as Professional[]) || []);
    setLoadingList(false);
  }

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
  }, [router]);

  async function handleDecision(
    decision: "approved" | "rejected",
  ) {
    if (!selected) {
      return;
    }

    setError("");
    setMessage("");

    if (decision === "rejected" && !rejectionReason.trim()) {
      setError("Informe o motivo da reprovação.");
      return;
    }

    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const { error: decisionError } = await supabase.rpc(
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

    if (decisionError) {
      setError(
        `Não foi possível registrar a decisão: ${decisionError.message}`,
      );
      setSaving(false);
      return;
    }

    if (decision === "approved") {
      setMessage("Profissional aprovado com sucesso.");
    } else {
      setMessage("Profissional reprovado com sucesso.");
    }

    setProfessionals((current) =>
      current.filter(
        (item) =>
          item.professional_id !== selected.professional_id,
      ),
    );

    setSelected(null);
    setRejectionReason("");
    setSaving(false);
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-sm text-zinc-400">
          Carregando VemGO Control...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Image
            src="/logo-vemgo.png"
            alt="VemGO"
            width={360}
            height={200}
            className="h-auto w-[190px] object-contain"
            priority
          />

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
              onClick={handleLogout}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-blue-500 hover:text-blue-400"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            PAINEL ADMINISTRATIVO
          </div>

          <h1 className="text-3xl font-bold">
            Validação de profissionais
          </h1>

          <p className="mt-2 text-zinc-400">
            Analise o cadastro profissional antes de liberar o
            profissional para receber oportunidades.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-blue-900/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Profissionais pendentes
              </h2>

              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                {professionals.length}
              </span>
            </div>

            {loadingList ? (
              <p className="mt-6 text-sm text-zinc-500">
                Carregando...
              </p>
            ) : professionals.length === 0 ? (
              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm text-zinc-400">
                  Nenhum profissional aguardando validação.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {professionals.map((professional) => (
                  <button
                    key={professional.professional_id}
                    onClick={() => {
                      setSelected(professional);
                      setRejectionReason("");
                      setError("");
                      setMessage("");
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected?.professional_id ===
                      professional.professional_id
                        ? "border-blue-600 bg-blue-950/20"
                        : "border-zinc-800 bg-zinc-950 hover:border-blue-700 hover:bg-zinc-900"
                    }`}
                  >
                    <p className="font-semibold text-white">
                      {professional.full_name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Identidade:{" "}
                      {professional.identity_status}
                    </p>

                    <p className="mt-2 text-xs text-blue-400">
                      Cadastro aguardando validação
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            {!selected ? (
              <div className="flex min-h-[500px] items-center justify-center text-center">
                <div>
                  <p className="text-lg font-semibold text-zinc-300">
                    Selecione um profissional
                  </p>

                  <p className="mt-2 max-w-md text-sm text-zinc-500">
                    Escolha um profissional na lista para
                    visualizar o cadastro e realizar a análise.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Profissional
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      {selected.full_name}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                      Identidade:{" "}
                      <span className="text-white">
                        {selected.identity_status}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      Verificação profissional:{" "}
                      <span className="text-white">
                        {selected.verification_status}
                      </span>
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    Pendente
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs text-zinc-500">
                      Serviços
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {selected.services_count}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      serviços ativos
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs text-zinc-500">
                      Preços
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {selected.prices_count}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      preços ativos
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs text-zinc-500">
                      Regiões
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {selected.regions_count}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      regiões configuradas
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-xs text-zinc-500">
                      Disponibilidade
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {selected.availability_count}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      períodos configurados
                    </p>
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
                    className="mt-4 min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      handleDecision("approved")
                    }
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovar profissional
                  </button>

                  <button
                    onClick={() =>
                      handleDecision("rejected")
                    }
                    disabled={saving}
                    className="rounded-xl border border-red-700 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reprovar profissional
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}