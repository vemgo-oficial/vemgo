"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type IdentityStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "manual_review";

type DocumentType = "cpf" | "rg" | "cnh" | "passport";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cpf: "CPF",
  rg: "RG",
  cnh: "CNH",
  passport: "Passaporte",
};

export default function IdentidadePage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] =
    useState<IdentityStatus>("unverified");

  const [documentType, setDocumentType] =
    useState<DocumentType>("cpf");

  const [documentNumber, setDocumentNumber] = useState("");

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requiresBackDocument =
    documentType === "rg" || documentType === "cnh";

  useEffect(() => {
    let cancelled = false;

    async function loadIdentityStatus() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        setError("Usuário não autenticado.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("identity_status")
          .eq("id", user.id)
          .single();

      if (cancelled) {
        return;
      }

      if (profileError) {
        setError(
          "Não foi possível carregar o status da identidade."
        );
        setLoading(false);
        return;
      }

      setIdentityStatus(
        (profile.identity_status as IdentityStatus) ||
          "unverified"
      );

      setLoading(false);
    }

    void Promise.resolve().then(loadIdentityStatus);

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function validateFile(
    file: File | null,
    required = false
  ) {
    if (!file) {
      if (required) {
        return "Selecione o arquivo obrigatório.";
      }

      return null;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato inválido. Use JPG, PNG ou PDF.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "O arquivo deve ter no máximo 10 MB.";
    }

    return null;
  }

  function handleDocumentTypeChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const newType = event.target.value as DocumentType;

    setDocumentType(newType);
    setBackFile(null);
    setError("");
    setMessage("");
  }

  function handleFrontFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    setFrontFile(file);
    setError("");
    setMessage("");
  }

  function handleBackFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    setBackFile(file);
    setError("");
    setMessage("");
  }

  function handleSelfieChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    setSelfieFile(file);
    setError("");
    setMessage("");
  }

  async function uploadFile(
    file: File,
    folder: string
  ) {
    if (!userId) {
      throw new Error("Usuário não autenticado.");
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase()
      : "bin";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const path = `${userId}/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return path;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!userId) {
      setError("Usuário não autenticado.");
      return;
    }

    const normalizedDocumentNumber =
      documentNumber.trim();

    if (!normalizedDocumentNumber) {
      setError("Informe o número do documento.");
      return;
    }

    const frontValidation = validateFile(
      frontFile,
      true
    );

    if (frontValidation) {
      setError(frontValidation);
      return;
    }

    const backValidation = validateFile(
      backFile,
      requiresBackDocument
    );

    if (backValidation) {
      if (requiresBackDocument) {
        setError(
          `O verso do ${DOCUMENT_TYPE_LABELS[documentType]} é obrigatório.`
        );
      } else {
        setError(backValidation);
      }

      return;
    }

    const selfieValidation = validateFile(
      selfieFile,
      true
    );

    if (selfieValidation) {
      setError(selfieValidation);
      return;
    }

    setSending(true);

    try {
      if (!frontFile || !selfieFile) {
        throw new Error(
          "Documento da frente e selfie são obrigatórios."
        );
      }

      const frontPath = await uploadFile(
        frontFile,
        "documents"
      );

      let backPath: string | null = null;

      if (backFile) {
        backPath = await uploadFile(
          backFile,
          "documents"
        );
      }

      const selfiePath = await uploadFile(
        selfieFile,
        "selfies"
      );

      const {
        data: identityDocument,
        error: documentError,
      } = await supabase
        .from("identity_documents")
        .insert({
          profile_id: userId,
          document_type: documentType,
          document_number: normalizedDocumentNumber,
          document_front_path: frontPath,
          document_back_path: backPath,
          verification_status: "pending",
        })
        .select("id")
        .single();

      if (documentError) {
        throw documentError;
      }

      const { error: verificationError } =
        await supabase
          .from("identity_verifications")
          .insert({
            profile_id: userId,
            identity_document_id:
              identityDocument.id,
            verification_type: "full_identity",
            status: "pending",
            selfie_path: selfiePath,
          });

      if (verificationError) {
        throw verificationError;
      }

      const {
        data: statusResult,
        error: statusError,
      } = await supabase.rpc(
        "submit_identity_for_review"
      );

      if (statusError) {
        throw statusError;
      }

      if (statusResult !== "pending") {
        throw new Error(
          "Não foi possível confirmar o envio da identidade."
        );
      }

      setIdentityStatus("pending");

      setMessage(
        "Sua documentação foi enviada e está aguardando análise."
      );

      setDocumentNumber("");
      setFrontFile(null);
      setBackFile(null);
      setSelfieFile(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar sua documentação."
      );
    } finally {
      setSending(false);
    }
  }

  function renderStatus() {
    if (identityStatus === "pending") {
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-400">
              Status
            </p>

            <p className="mt-2 font-semibold text-white">
              Em análise pela VemGO
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-300">
              Sua documentação foi recebida e está
              aguardando análise.
            </p>
          </div>
        </div>
      );
    }

    if (identityStatus === "verified") {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-sm text-zinc-400">
            Status
          </p>

          <p className="mt-2 font-semibold text-white">
            Identidade verificada
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            Sua identidade foi confirmada pela VemGO.
          </p>
        </div>
      );
    }

    if (identityStatus === "manual_review") {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-sm text-zinc-400">
            Status
          </p>

          <p className="mt-2 font-semibold text-white">
            Em análise manual
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            Sua documentação precisa de uma análise
            adicional pela equipe VemGO.
          </p>
        </div>
      );
    }

    if (identityStatus === "rejected") {
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-400">
              Status
            </p>

            <p className="mt-2 font-semibold text-white">
              Verificação não aprovada
            </p>

            <p className="mt-3 text-sm text-zinc-400">
              Sua documentação não foi aprovada. Envie
              uma nova documentação para análise.
            </p>
          </div>

          {renderForm()}
        </div>
      );
    }

    return renderForm();
  }

  function renderForm() {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div>
          <label
            htmlFor="documentType"
            className="mb-2 block text-sm text-zinc-300"
          >
            Tipo de documento
          </label>

          <select
            id="documentType"
            value={documentType}
            onChange={handleDocumentTypeChange}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-500"
          >
            <option value="cpf">CPF</option>
            <option value="rg">RG</option>
            <option value="cnh">CNH</option>
            <option value="passport">
              Passaporte
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="documentNumber"
            className="mb-2 block text-sm text-zinc-300"
          >
            Número do documento
          </label>

          <input
            id="documentNumber"
            type="text"
            value={documentNumber}
            onChange={(event) =>
              setDocumentNumber(event.target.value)
            }
            placeholder="Digite o número do documento"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="frontFile"
            className="mb-2 block text-sm text-zinc-300"
          >
            Documento — frente
          </label>

          <input
            id="frontFile"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFrontFileChange}
            required
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
          />

          <p className="mt-2 text-xs text-zinc-500">
            JPG, PNG ou PDF. Máximo de 10 MB.
          </p>
        </div>

        {requiresBackDocument && (
          <div>
            <label
              htmlFor="backFile"
              className="mb-2 block text-sm text-zinc-300"
            >
              Documento — verso
              <span className="ml-2 text-xs font-semibold text-red-400">
                obrigatório
              </span>
            </label>

            <input
              id="backFile"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleBackFileChange}
              required
              className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
            />

            <p className="mt-2 text-xs text-zinc-500">
              JPG, PNG ou PDF. Máximo de 10 MB.
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="selfieFile"
            className="mb-2 block text-sm text-zinc-300"
          >
            Selfie
          </label>

          <input
            id="selfieFile"
            type="file"
            accept="image/jpeg,image/png"
            capture="user"
            onChange={handleSelfieChange}
            required
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
          />

          <p className="mt-2 text-xs text-zinc-500">
            Envie uma foto nítida do seu rosto.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending
            ? "Enviando documentação..."
            : "Enviar documentos"}
        </button>
      </form>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-zinc-400">
            Carregando...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profissional"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Voltar
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">
            Verificação de identidade
          </h1>

          <p className="mt-2 text-zinc-400">
            Precisamos confirmar sua identidade para
            aumentar a segurança da rede VemGO.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6">
          {renderStatus()}
        </div>
      </div>
    </main>
  );
}