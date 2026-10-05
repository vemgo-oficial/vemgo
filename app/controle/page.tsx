"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Verification = {
  verification_id: string;
  profile_id: string;
  full_name: string;
  user_type: string;
  identity_status: string;
  document_id: string | null;
  document_type: string | null;
  document_number: string | null;
  document_front_path: string | null;
  document_back_path: string | null;
  selfie_path: string | null;
  verification_status: string;
  created_at: string;
};

type SelectedVerification = Verification & {
  frontUrl: string | null;
  backUrl: string | null;
  selfieUrl: string | null;
};

export default function ControlePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [verifications, setVerifications] = useState<
    Verification[]
  >([]);

  const [selected, setSelected] =
    useState<SelectedVerification | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminAndVerifications() {
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

      await loadVerifications();
    }

    async function loadVerifications() {
      setLoadingList(true);
      setError("");

      const supabase = createSupabaseBrowserClient();

      const {
        data,
        error: verificationError,
      } = await supabase.rpc(
        "get_pending_identity_verifications"
      );

      if (cancelled) {
        return;
      }

      if (verificationError) {
        setError(
          `Não foi possível carregar as verificações: ${verificationError.message}`
        );
        setLoadingList(false);
        return;
      }

      setVerifications(
        (data as Verification[]) || []
      );

      setLoadingList(false);
    }

    void Promise.resolve().then(
      loadAdminAndVerifications
    );

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function openVerification(
    verification: Verification
  ) {
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    let frontUrl: string | null = null;
    let backUrl: string | null = null;
    let selfieUrl: string | null = null;

    if (verification.document_front_path) {
      const { data, error } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(
          verification.document_front_path,
          600
        );

      if (error) {
        setError(
          `Não foi possível abrir a frente do documento: ${error.message}`
        );
        return;
      }

      frontUrl = data.signedUrl;
    }

    if (verification.document_back_path) {
      const { data, error } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(
          verification.document_back_path,
          600
        );

      if (error) {
        setError(
          `Não foi possível abrir o verso do documento: ${error.message}`
        );
        return;
      }

      backUrl = data.signedUrl;
    }

    if (verification.selfie_path) {
      const { data, error } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(
          verification.selfie_path,
          600
        );

      if (error) {
        setError(
          `Não foi possível abrir a selfie: ${error.message}`
        );
        return;
      }

      selfieUrl = data.signedUrl;
    }

    setSelected({
      ...verification,
      frontUrl,
      backUrl,
      selfieUrl,
    });

    setRejectionReason("");
  }

  async function handleDecision(
    decision:
      | "approved"
      | "rejected"
      | "manual_review"
  ) {
    if (!selected) {
      return;
    }

    setError("");
    setMessage("");

    if (
      decision === "rejected" &&
      !rejectionReason.trim()
    ) {
      setError(
        "Informe o motivo da reprovação."
      );
      return;
    }

    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const { error: decisionError } =
      await supabase.rpc(
        "review_identity_verification",
        {
          p_verification_id:
            selected.verification_id,
          p_decision: decision,
          p_rejection_reason:
            decision === "rejected"
              ? rejectionReason.trim()
              : null,
        }
      );

    if (decisionError) {
      setError(
        `Não foi possível registrar a decisão: ${decisionError.message}`
      );
      setSaving(false);
      return;
    }

    let successMessage =
      "Decisão registrada com sucesso.";

    if (decision === "approved") {
      successMessage =
        "Identidade aprovada com sucesso.";
    }

    if (decision === "rejected") {
      successMessage =
        "Identidade reprovada com sucesso.";
    }

    if (decision === "manual_review") {
      successMessage =
        "Identidade enviada para análise manual.";
    }

    setMessage(successMessage);

    setVerifications((current) =>
      current.filter(
        (item) =>
          item.verification_id !==
          selected.verification_id
      )
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
          <div className="flex items-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="h-auto w-[190px] object-contain"
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

          <h2 className="text-3xl font-bold">
            Verificações de identidade
          </h2>

          <p className="mt-2 text-zinc-400">
            Analise a documentação enviada pelos usuários
            antes de liberar a identidade.
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Pendentes
              </h3>

              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                {verifications.length}
              </span>
            </div>

            {loadingList ? (
              <p className="mt-6 text-sm text-zinc-500">
                Carregando...
              </p>
            ) : verifications.length === 0 ? (
              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm text-zinc-400">
                  Nenhuma verificação pendente.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {verifications.map((verification) => (
                  <button
                    key={verification.verification_id}
                    onClick={() =>
                      openVerification(verification)
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-blue-700 hover:bg-zinc-900"
                  >
                    <p className="font-semibold text-white">
                      {verification.full_name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {verification.document_type?.toUpperCase() ||
                        "Documento"}
                    </p>

                    <p className="mt-2 text-xs text-blue-400">
                      Aguardando análise
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
                    Selecione uma verificação
                  </p>

                  <p className="mt-2 max-w-md text-sm text-zinc-500">
                    Escolha um usuário na lista para visualizar
                    os documentos e realizar a análise.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Usuário
                    </p>

                    <h3 className="mt-1 text-2xl font-bold">
                      {selected.full_name}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      Documento:{" "}
                      {selected.document_type?.toUpperCase() ||
                        "Não informado"}
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      Número:{" "}
                      {selected.document_number ||
                        "Não informado"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    Pendente
                  </span>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-zinc-300">
                      Frente do documento
                    </p>

                    {selected.frontUrl ? (
                      <a
                        href={selected.frontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"
                      >
                        <div className="relative h-64 w-full">
                          <Image
                            src={selected.frontUrl}
                            alt="Frente do documento"
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                      </a>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">
                        Não disponível
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-zinc-300">
                      Verso do documento
                    </p>

                    {selected.backUrl ? (
                      <a
                        href={selected.backUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"
                      >
                        <div className="relative h-64 w-full">
                          <Image
                            src={selected.backUrl}
                            alt="Verso do documento"
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                      </a>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">
                        Não enviado
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-zinc-300">
                      Selfie
                    </p>

                    {selected.selfieUrl ? (
                      <a
                        href={selected.selfieUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"
                      >
                        <div className="relative h-64 w-full">
                          <Image
                            src={selected.selfieUrl}
                            alt="Selfie de verificação"
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                      </a>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">
                        Não disponível
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                  <label
                    htmlFor="rejectionReason"
                    className="mb-2 block text-sm font-semibold text-zinc-300"
                  >
                    Motivo da reprovação

                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      obrigatório somente ao reprovar
                    </span>
                  </label>

                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: documento ilegível, divergência de dados..."
                    className="min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500"
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
                    Aprovar identidade
                  </button>

                  <button
                    onClick={() =>
                      handleDecision("manual_review")
                    }
                    disabled={saving}
                    className="rounded-xl border border-amber-600 px-5 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Análise manual
                  </button>

                  <button
                    onClick={() =>
                      handleDecision("rejected")
                    }
                    disabled={saving}
                    className="rounded-xl border border-red-700 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reprovar identidade
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