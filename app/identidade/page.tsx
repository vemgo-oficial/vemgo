"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase-browser";

type IdentityDocument = {
  id: string;
  document_type: string;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
};

type IdentityVerification = {
  id: string;
  verification_type: string;
  status: string;
  provider: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Em análise";
    case "approved":
    case "verified":
      return "Aprovada";
    case "rejected":
      return "Rejeitada";
    default:
      return status;
  }
}

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
    case "verified":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "default";
  }
}

function documentLabel(type: string) {
  switch (type) {
    case "cpf":
      return "CPF";
    case "cnpj":
      return "CNPJ";
    case "rg":
      return "RG";
    case "cnh":
      return "CNH";
    default:
      return type.toUpperCase();
  }
}

export default function IdentidadePage() {
  const router = useRouter();
  const identityTheme = { "--portal-accent": "#f97316" } as CSSProperties;

  const [document, setDocument] = useState<IdentityDocument | null>(null);
  const [verification, setVerification] =
    useState<IdentityVerification | null>(null);
  const [identityStatus, setIdentityStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIdentity() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?redirect=/identidade");
        return;
      }

      const [{ data: profile, error: profileError }, { data: documentData }, {
        data: verificationData,
      }] = await Promise.all([
        supabase
          .from("profiles")
          .select("identity_status")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("identity_documents")
          .select(
            "id, document_type, verification_status, rejection_reason, verified_at, created_at",
          )
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("identity_verifications")
          .select(
            "id, verification_type, status, provider, rejection_reason, verified_at, created_at",
          )
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileError) {
        setError("Não foi possível carregar seus dados de identidade.");
      } else {
        setIdentityStatus(profile?.identity_status ?? "pending");
        setDocument(documentData);
        setVerification(verificationData);
      }

      setLoading(false);
    }

    void loadIdentity();
  }, [router]);

  if (loading) {
    return (
      <main
        className="min-h-screen bg-black px-4 py-10"
        data-portal-theme="professional"
        style={identityTheme}
      >
        <div className="mx-auto flex max-w-3xl justify-center">
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-black px-4 py-8 text-white"
      data-portal-theme="professional"
      style={identityTheme}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-[var(--portal-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
        >
          ← Voltar
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--portal-accent)]">
            Verificação de identidade
          </h1>

          <p className="mt-2 text-zinc-400">
            Acompanhe aqui o status da sua verificação de identidade na VemGO.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-5">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500">Status da identidade</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {statusLabel(identityStatus)}
                </h2>
              </div>

              <Badge variant={statusVariant(identityStatus)}>
                {statusLabel(identityStatus)}
              </Badge>
            </div>

            {identityStatus === "rejected" && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-medium text-red-300">
                  A verificação precisa ser refeita.
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  Consulte os detalhes abaixo e, se necessário, refaça o
                  processo de verificação.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Documento</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Documento utilizado no processo de identificação.
              </p>
            </div>

            {document ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-sm text-zinc-500">Tipo</p>
                    <p className="mt-1 font-medium">
                      {documentLabel(document.document_type)}
                    </p>
                  </div>

                  <Badge variant={statusVariant(document.verification_status)}>
                    {statusLabel(document.verification_status)}
                  </Badge>
                </div>

                {document.rejection_reason && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm font-medium text-red-300">
                      Motivo da rejeição
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      {document.rejection_reason}
                    </p>
                  </div>
                )}

                {document.verified_at && (
                  <p className="text-sm text-zinc-500">
                    Verificado em{" "}
                    {new Date(document.verified_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-zinc-400">
                  Nenhum documento de identidade foi enviado.
                </p>

                <Link
                  href="/cadastro-profissional/identidade"
                  className="mt-4 inline-block"
                >
                  <Button variant="professional">
                    Iniciar verificação
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Validação</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Informações sobre a última validação realizada.
              </p>
            </div>

            {verification ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-zinc-500">Tipo de validação</p>
                    <p className="mt-1 font-medium">
                      {verification.verification_type}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-zinc-500">Status</p>
                    <div className="mt-2">
                      <Badge variant={statusVariant(verification.status)}>
                        {statusLabel(verification.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {verification.provider && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-zinc-500">Provedor</p>
                    <p className="mt-1 font-medium">
                      {verification.provider}
                    </p>
                  </div>
                )}

                {verification.rejection_reason && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm font-medium text-red-300">
                      Motivo
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      {verification.rejection_reason}
                    </p>
                  </div>
                )}

                {verification.verified_at && (
                  <p className="text-sm text-zinc-500">
                    Validação concluída em{" "}
                    {new Date(verification.verified_at).toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Ainda não existe uma validação registrada.
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="sm:flex-1">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
              >
                Voltar para o início
              </Button>
            </Link>

            {identityStatus === "rejected" && (
              <Link
                href="/cadastro-profissional/identidade"
                className="sm:flex-1"
              >
                <Button
                  type="button"
                  variant="professional"
                  className="w-full"
                >
                  Refazer verificação
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
