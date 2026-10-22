
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type VerificationStatus =
  | "unverified"
  | "pending"
  | "processing"
  | "manual_review"
  | "verified"
  | "rejected";

export default function ClienteVerificacaoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const sendingCode = false;
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityStatus, setIdentityStatus] =
    useState<VerificationStatus>("unverified");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
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
          "full_name, user_type, status, phone, phone_verified_at, identity_status, identity_verified_at, client_verification_status",
        )
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

      setEmail(user.email || "");
      setPhone(profile.phone || "");
      setEmailVerified(Boolean(user.email_confirmed_at));
      setPhoneVerified(Boolean(profile.phone_verified_at));

      const profileIdentityStatus = String(
        profile.identity_status || profile.client_verification_status || "",
      ).toLowerCase();

      if (
        profile.identity_verified_at ||
        profileIdentityStatus === "verified" ||
        profileIdentityStatus === "approved"
      ) {
        setIdentityStatus("verified");
      } else {
        const { data: verification } = await supabase
          .from("identity_verifications")
          .select("status")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          const verificationStatus = String(verification?.status || "").toLowerCase();

          if (verificationStatus === "verified" || verificationStatus === "approved") {
            setIdentityStatus("verified");
          } else if (
            verificationStatus === "pending" ||
            verificationStatus === "processing" ||
            verificationStatus === "manual_review"
          ) {
            setIdentityStatus(verificationStatus as VerificationStatus);
          } else if (verificationStatus === "rejected") {
            setIdentityStatus("rejected");
          } else if (
            profileIdentityStatus === "pending" ||
            profileIdentityStatus === "processing" ||
            profileIdentityStatus === "manual_review" ||
            profileIdentityStatus === "rejected"
          ) {
            setIdentityStatus(profileIdentityStatus as VerificationStatus);
          } else {
            setIdentityStatus("unverified");
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void Promise.resolve().then(loadVerification);

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Informe seu número de celular.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("Informe um celular válido com DDD.");
      return;
    }

    setError("A verificação segura por SMS/WhatsApp ainda não está configurada.");
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Digite o código de 6 dígitos.");
      return;
    }

    setVerifyingCode(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error: rpcError } = await supabase.rpc(
        "verify_phone_code",
        {
          p_code: normalizedCode,
        },
      );

      if (rpcError) {
        setError(
          rpcError.message || "Não foi possível validar o código.",
        );
        return;
      }

      if (data !== true) {
        setError("Não foi possível confirmar seu celular.");
        return;
      }

      setPhoneVerified(true);
      setCode("");
      setMessage("Celular verificado com sucesso.");
    } catch {
      setError("Não foi possível validar o código.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleResend() {
    setMessage("");
    setError("");

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Informe seu número de celular.");
      return;
    }

    setError("A verificação segura por SMS/WhatsApp ainda não está configurada.");
  }

  function getIdentityLabel() {
    switch (identityStatus) {
      case "verified":
        return "Verificada";

      case "pending":
      case "processing":
      case "manual_review":
        return "Em análise";

      case "rejected":
        return "Necessita nova análise";

      default:
        return "Não verificada";
    }
  }

  function getIdentityColor() {
    switch (identityStatus) {
      case "verified":
        return "text-green-400";

      case "pending":
      case "processing":
      case "manual_review":
        return "text-orange-400";

      case "rejected":
        return "text-red-400";

      default:
        return "text-zinc-400";
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">
          Carregando verificação...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/cliente")}
          className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-green-400 transition hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        >
          <span aria-hidden="true">←</span>
          <span>Voltar para minha área</span>
        </button>
        <div className="mb-8">
          <div className="mb-5 inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-green-400">
            SEGURANÇA DA CONTA
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Verificação da sua conta
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            A VemGO utiliza verificações para aumentar a segurança
            dos clientes e profissionais durante os atendimentos.
          </p>
        </div>

        {(message || error) && (
          <div
            role="status"
            className={[
              "mb-6 rounded-xl border px-4 py-3 text-sm",
              error
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-400",
            ].join(" ")}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* E-MAIL */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Etapa 1
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  E-mail
                </h2>
              </div>

              <span
                className={
                  emailVerified
                    ? "text-sm font-medium text-green-400"
                    : "text-sm font-medium text-orange-400"
                }
              >
                {emailVerified ? "Verificado" : "Pendente"}
              </span>
            </div>

            <p className="break-all text-sm text-zinc-300">
              {email || "E-mail não informado"}
            </p>

            {!emailVerified && (
              <p className="mt-4 text-xs leading-5 text-orange-300">
                Confirme seu e-mail para aumentar a segurança da
                conta.
              </p>
            )}
          </section>

          {/* CELULAR */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Etapa 2
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Celular
                </h2>
              </div>

              <span
                className={
                  phoneVerified
                    ? "text-sm font-medium text-green-400"
                    : "text-sm font-medium text-orange-400"
                }
              >
                {phoneVerified ? "Verificado" : "Pendente"}
              </span>
            </div>

            {phoneVerified ? (
              <>
                <p className="text-sm text-zinc-300">{phone}</p>

                <p className="mt-4 text-xs leading-5 text-green-400">
                  Seu celular foi confirmado com sucesso.
                </p>
              </>
            ) : (
              <form
                onSubmit={handleSendCode}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Número de celular
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="(14) 99999-9999"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-green-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingCode}
                  className="w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingCode ? "Enviando..." : "Enviar código"}
                </button>
              </form>
            )}
          </section>

          {/* IDENTIDADE */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Etapa 3
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Identidade
                </h2>
              </div>

              <span
                className={`text-sm font-medium ${getIdentityColor()}`}
              >
                {getIdentityLabel()}
              </span>
            </div>

            <p className="text-sm leading-6 text-zinc-400">
              Documento e selfie são utilizados para confirmar
              sua identidade.
            </p>

            {identityStatus === "verified" ? (
              <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm font-medium text-green-400">
                  Identidade confirmada
                </p>

                <p className="mt-1 text-xs text-green-400/80">
                  Sua conta está com a identidade verificada.
                </p>
              </div>
            ) : identityStatus === "pending" ||
              identityStatus === "processing" ||
              identityStatus === "manual_review" ? (
              <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                <p className="text-sm font-medium text-orange-300">
                  Documentos em análise
                </p>

                <p className="mt-1 text-xs text-orange-200/70">
                  Aguarde a conclusão da análise.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.push("/cliente/verificacao/identidade")
                }
                className="mt-5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-green-500 hover:bg-zinc-800"
              >
                Enviar documento e selfie
              </button>
            )}
          </section>
        </div>

        {/* CÓDIGO DO CELULAR */}
        {!phoneVerified && phone && (
          <section className="mt-6 max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Confirmação
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Digite o código recebido
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Informe o código de 6 dígitos para confirmar seu
                celular.
              </p>
            </div>

            <form
              onSubmit={handleVerifyCode}
              className="space-y-4"
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-zinc-700 focus:border-green-500"
              />

              <button
                type="submit"
                disabled={verifyingCode || code.length !== 6}
                className="w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifyingCode
                  ? "Validando..."
                  : "Confirmar celular"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={sendingCode}
              className="mt-4 w-full text-center text-xs font-medium text-zinc-400 transition hover:text-green-400 disabled:opacity-50"
            >
              {sendingCode
                ? "Reenviando..."
                : "Não recebeu? Reenviar código"}
            </button>
          </section>
        )}

        {/* RESUMO */}
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Segurança da conta
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Quanto mais etapas concluídas, maior a segurança
                da sua conta VemGO.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/cliente")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-500/40 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500/10"
            >
              <span aria-hidden="true">←</span>
              <span>Voltar para minha área</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
