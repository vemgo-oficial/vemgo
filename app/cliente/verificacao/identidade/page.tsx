"use client";

import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type DocumentType = "rg" | "cnh";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type IdentityStatus =
  | "unverified"
  | "pending"
  | "processing"
  | "manual_review"
  | "verified"
  | "approved"
  | "rejected";

export default function ClienteIdentidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState("");
  const [documentType, setDocumentType] =
    useState<DocumentType>("cnh");
  const [documentNumber, setDocumentNumber] = useState("");

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");

  const [identityStatus, setIdentityStatus] =
    useState<IdentityStatus>("unverified");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "user_type, status, identity_verified_at, client_verification_status",
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

      setUserId(user.id);

      if (profile.identity_verified_at) {
        setIdentityStatus("verified");
        setLoading(false);
        return;
      }

      const { data: verification } = await supabase
        .from("identity_verifications")
        .select("status")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (verification?.status) {
        setIdentityStatus(
          verification.status as IdentityStatus,
        );
      } else if (profile.client_verification_status) {
        setIdentityStatus(
          profile.client_verification_status as IdentityStatus,
        );
      }

      setLoading(false);
    }

    void Promise.resolve().then(loadIdentity);

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (frontPreview) {
        URL.revokeObjectURL(frontPreview);
      }

      if (backPreview) {
        URL.revokeObjectURL(backPreview);
      }

      if (selfiePreview) {
        URL.revokeObjectURL(selfiePreview);
      }
    };
  }, [frontPreview, backPreview, selfiePreview]);

  function validateImage(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Escolha uma imagem JPG, PNG ou WEBP.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "A imagem precisa ter no máximo 8 MB.";
    }

    return "";
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    type: "front" | "back" | "selfie",
  ) {
    setError("");
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);

    if (type === "front") {
      if (frontPreview) {
        URL.revokeObjectURL(frontPreview);
      }

      setFrontFile(file);
      setFrontPreview(preview);
    }

    if (type === "back") {
      if (backPreview) {
        URL.revokeObjectURL(backPreview);
      }

      setBackFile(file);
      setBackPreview(preview);
    }

    if (type === "selfie") {
      if (selfiePreview) {
        URL.revokeObjectURL(selfiePreview);
      }

      setSelfieFile(file);
      setSelfiePreview(preview);
    }
  }

  async function uploadFile(
    file: File,
    path: string,
  ) {
    const { error: uploadError } =
      await supabase.storage
        .from("identity-documents")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedNumber = documentNumber.trim();

    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    if (!normalizedNumber) {
      setError("Informe o número do documento.");
      return;
    }

    if (!frontFile) {
      setError(
        "Envie a foto da frente do documento.",
      );
      return;
    }

    if (!backFile) {
      setError(
        "Envie também a foto do verso do documento.",
      );
      return;
    }

    if (!selfieFile) {
      setError("Envie uma selfie para continuar.");
      return;
    }

    setSubmitting(true);

    let frontPath = "";
    let backPath = "";
    let selfiePath = "";

    try {
      const timestamp = Date.now();

      const frontExtension =
        frontFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const backExtension =
        backFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const selfieExtension =
        selfieFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      frontPath =
        `${userId}/client-verification/front-${timestamp}.${frontExtension}`;

      backPath =
        `${userId}/client-verification/back-${timestamp}.${backExtension}`;

      selfiePath =
        `${userId}/client-verification/selfie-${timestamp}.${selfieExtension}`;

      await uploadFile(frontFile, frontPath);
      await uploadFile(backFile, backPath);
      await uploadFile(selfieFile, selfiePath);

      const {
        data: identityDocument,
        error: documentError,
      } = await supabase
        .from("identity_documents")
        .insert({
          profile_id: userId,
          document_type: documentType,
          document_number: normalizedNumber,
          document_front_path: frontPath,
          document_back_path: backPath,
          verification_status: "pending",
        })
        .select("id")
        .single();

      if (
        documentError ||
        !identityDocument
      ) {
        throw new Error(
          documentError?.message ||
            "Não foi possível registrar o documento.",
        );
      }

      const {
        error: verificationError,
      } = await supabase
        .from("identity_verifications")
        .insert({
          profile_id: userId,
          identity_document_id:
            identityDocument.id,
          verification_type:
            "full_identity",
          status: "pending",
          selfie_path: selfiePath,
        });

      if (verificationError) {
        throw new Error(
          verificationError.message,
        );
      }

      const { error: submissionError } = await supabase.rpc(
        "submit_identity_for_review",
      );

      if (submissionError) {
        throw new Error(
          submissionError.message,
        );
      }

      setIdentityStatus("pending");

      setMessage(
        "Documentos enviados com sucesso. Sua identidade está aguardando análise.",
      );

      setDocumentNumber("");
      setFrontFile(null);
      setBackFile(null);
      setSelfieFile(null);

      setFrontPreview("");
      setBackPreview("");
      setSelfiePreview("");
    } catch (submitError) {
      const pathsToRemove = [
        frontPath,
        backPath,
        selfiePath,
      ].filter(Boolean);

      if (pathsToRemove.length > 0) {
        await supabase.storage
          .from("identity-documents")
          .remove(pathsToRemove);
      }

      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar sua identidade.";

      setError(
        `Não foi possível concluir o envio: ${errorMessage}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">
          Carregando sua validação...
        </p>
      </main>
    );
  }

  if (
    identityStatus === "pending" ||
    identityStatus === "processing" ||
    identityStatus === "manual_review"
  ) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <button type="button" onClick={() => router.push("/cliente/verificacao")} className="rounded-lg text-sm font-semibold text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            ← Voltar para verificação
          </button>
        </div>

        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-10">
          <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
              ⏳
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Identidade em análise
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Recebemos seus documentos e selfie.
              Nossa equipe fará a análise e você
              poderá acompanhar o resultado pela
              área de verificação.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/cliente/verificacao",
                )
              }
              className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Voltar para verificação
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (
    identityStatus === "verified" ||
    identityStatus === "approved"
  ) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-10">
          <section className="w-full rounded-2xl border border-emerald-500/20 bg-zinc-950 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
              ✓
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Identidade verificada
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Sua identidade já foi confirmada
              pela VemGO.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/cliente/verificacao",
                )
              }
              className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Voltar para verificação
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button type="button" onClick={() => router.push("/cliente/verificacao")} className="mb-6 rounded-lg text-sm font-semibold text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          ← Voltar para verificação
        </button>
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            ETAPA 3
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Confirmar identidade
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Envie seu documento e uma selfie para
            confirmar que a conta pertence a você.
          </p>
        </div>

        {(message || error) && (
          <div
            className={[
              "mb-6 rounded-xl border px-4 py-3 text-sm",
              error
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            ].join(" ")}
          >
            {error || message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold">
              1. Documento
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Use um documento oficial válido.
            </p>

            <div className="mt-5">
              <label
                htmlFor="documentType"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Tipo de documento
              </label>

              <select
                id="documentType"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(
                    event.target.value as DocumentType,
                  )
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="cnh">CNH</option>
                <option value="rg">RG</option>
              </select>
            </div>

            <div className="mt-5">
              <label
                htmlFor="documentNumber"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Número do documento
              </label>

              <input
                id="documentNumber"
                type="text"
                value={documentNumber}
                onChange={(event) =>
                  setDocumentNumber(
                    event.target.value,
                  )
                }
                placeholder="Digite o número do documento"
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold">
              2. Frente do documento
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Tire uma foto nítida, sem cortes e sem
              reflexos.
            </p>

            <label
              htmlFor="frontFile"
              className="mt-5 block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center transition hover:border-zinc-500"
            >
              <span className="text-sm font-medium text-white">
                {frontFile
                  ? frontFile.name
                  : "Selecionar frente do documento"}
              </span>

              <span className="mt-2 block text-xs text-zinc-500">
                JPG, PNG ou WEBP — máximo 8 MB
              </span>

              <input
                id="frontFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleImageChange(
                    event,
                    "front",
                  )
                }
                className="sr-only"
              />
            </label>

            {frontPreview && (
              <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <Image
                  src={frontPreview}
                  alt="Prévia da frente do documento"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain"
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold">
              3. Verso do documento
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Envie o verso completo e legível.
            </p>

            <label
              htmlFor="backFile"
              className="mt-5 block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center transition hover:border-zinc-500"
            >
              <span className="text-sm font-medium text-white">
                {backFile
                  ? backFile.name
                  : "Selecionar verso do documento"}
              </span>

              <span className="mt-2 block text-xs text-zinc-500">
                JPG, PNG ou WEBP — máximo 8 MB
              </span>

              <input
                id="backFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleImageChange(
                    event,
                    "back",
                  )
                }
                className="sr-only"
              />
            </label>

            {backPreview && (
              <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <Image
                  src={backPreview}
                  alt="Prévia do verso do documento"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain"
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold">
              4. Selfie
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Tire uma selfie com boa iluminação,
              mostrando claramente seu rosto.
            </p>

            <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-xs leading-5 text-orange-200/80">
                Esta etapa comprova a identidade da
                conta. A VemGO ainda não realiza
                reconhecimento facial automático nesta
                versão.
              </p>
            </div>

            <label
              htmlFor="selfieFile"
              className="mt-5 block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center transition hover:border-zinc-500"
            >
              <span className="text-sm font-medium text-white">
                {selfieFile
                  ? selfieFile.name
                  : "Selecionar selfie"}
              </span>

              <span className="mt-2 block text-xs text-zinc-500">
                JPG, PNG ou WEBP — máximo 8 MB
              </span>

              <input
                id="selfieFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={(event) =>
                  handleImageChange(
                    event,
                    "selfie",
                  )
                }
                className="sr-only"
              />
            </label>

            {selfiePreview && (
              <div className="relative mx-auto mt-5 h-96 max-w-sm overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <Image
                  src={selfiePreview}
                  alt="Prévia da selfie"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 384px"
                  className="object-contain"
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="font-semibold">
              Segurança e privacidade
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Seus documentos e selfie serão armazenados
              em área privada e utilizados exclusivamente
              para a análise de identidade da sua conta.
            </p>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 px-5 py-4 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Enviando documentos..."
              : "Enviar para análise"}
          </button>
        </form>
      </div>
    </main>
  );
}
