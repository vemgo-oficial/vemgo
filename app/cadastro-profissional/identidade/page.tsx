
"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Button from "@/components/ui/Button";

type DocumentType = "rg" | "cnh" | "passport";

const DOCUMENT_TYPES: {
  value: DocumentType;
  label: string;
}[] = [
  { value: "rg", label: "RG" },
  { value: "cnh", label: "CPF / CNH" },
  { value: "passport", label: "Passaporte" },
];

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const STEP_NUMBER = 4;
const TOTAL_STEPS = 9;

export default function CadastroProfissionalIdentidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

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

  const [existingStatus, setExistingStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        const { data: verification, error: verificationError } =
          await supabase
            .from("identity_verifications")
            .select("status")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (cancelled) return;

        if (verificationError) {
          setError(
            "Não foi possível consultar o status da sua validação. Tente novamente.",
          );
        } else if (verification?.status) {
          setExistingStatus(verification.status);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar sua validação.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
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
    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);

    if (type === "front") {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(preview);
    } else if (type === "back") {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setBackPreview(preview);
    } else {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfieFile(file);
      setSelfiePreview(preview);
    }
  }

  function sanitizeDocumentNumber(value: string) {
    return value.trim();
  }

  async function uploadFile(file: File, path: string) {
    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  }

  async function advanceOnboarding() {
    if (!userId) {
      throw new Error("Usuário não identificado.");
    }

    const { error: onboardingError } = await supabase
      .from("profiles")
      .update({ professional_onboarding_step: 5 })
      .eq("id", userId);

    if (onboardingError) {
      throw new Error(
        `Não foi possível atualizar o progresso do cadastro: ${onboardingError.message}`,
      );
    }
  }

  async function handleSubmit() {
    setError("");
    setMessage("");

    const normalizedNumber = sanitizeDocumentNumber(documentNumber);

    if (!normalizedNumber) {
      setError("Informe o número do documento.");
      return;
    }

    if (!frontFile) {
      setError("Envie a foto da frente do documento.");
      return;
    }

    if (documentType !== "passport" && !backFile) {
      setError("Envie também a foto do verso do documento.");
      return;
    }

    if (!selfieFile) {
      setError("Envie uma selfie para continuar.");
      return;
    }

    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    setSubmitting(true);

    let frontPath = "";
    let backPath = "";
    let selfiePath = "";
    let documentId = "";

    try {
      const timestamp = Date.now();

      const frontExtension =
        frontFile.name.split(".").pop()?.toLowerCase() || "jpg";

      const selfieExtension =
        selfieFile.name.split(".").pop()?.toLowerCase() || "jpg";

      frontPath =
        `${userId}/identity/front-${timestamp}.${frontExtension}`;

      selfiePath =
        `${userId}/identity/selfie-${timestamp}.${selfieExtension}`;

      if (documentType !== "passport" && backFile) {
        const backExtension =
          backFile.name.split(".").pop()?.toLowerCase() || "jpg";

        backPath =
          `${userId}/identity/back-${timestamp}.${backExtension}`;
      }

      await uploadFile(frontFile, frontPath);

      if (documentType !== "passport" && backFile && backPath) {
        await uploadFile(backFile, backPath);
      }

      await uploadFile(selfieFile, selfiePath);

      const {
        data: document,
        error: documentError,
      } = await supabase
        .from("identity_documents")
        .insert({
          profile_id: userId,
          document_type: documentType,
          document_number: normalizedNumber,
          document_front_path: frontPath,
          document_back_path: backPath || null,
          verification_status: "pending",
        })
        .select("id")
        .single();

      if (documentError || !document) {
        throw new Error(
          documentError?.message ||
            "Não foi possível registrar o documento.",
        );
      }

      documentId = document.id;

      const { error: verificationError } = await supabase
        .from("identity_verifications")
        .insert({
          profile_id: userId,
          identity_document_id: document.id,
          verification_type: "full_identity",
          status: "pending",
          selfie_path: selfiePath,
        });

      if (verificationError) {
        await supabase.storage
          .from("identity-documents")
          .remove([
            frontPath,
            ...(backPath ? [backPath] : []),
            selfiePath,
          ]);

        throw new Error(verificationError.message);
      }

      const { error: submissionError } = await supabase.rpc(
        "submit_identity_for_review",
      );

      if (submissionError) {
        throw new Error(submissionError.message);
      }

      await advanceOnboarding();

      setExistingStatus("pending");
      setMessage(
        "Documentos enviados. Sua identidade está aguardando validação.",
      );

      window.setTimeout(() => {
        router.push("/cadastro-profissional/competencias");
      }, 1200);
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar sua identidade.";

      setError(`Não foi possível concluir o envio: ${errorMessage}`);

      // Evita manter arquivos enviados sem registro do documento.
      if (!documentId) {
        const paths = [frontPath, backPath, selfiePath].filter(Boolean);

        if (paths.length > 0) {
          await supabase.storage
            .from("identity-documents")
            .remove(paths)
            .catch(() => undefined);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithExistingVerification() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await advanceOnboarding();
      router.push("/cadastro-profissional/competencias");
    } catch (continueError) {
      const errorMessage =
        continueError instanceof Error
          ? continueError.message
          : "Não foi possível continuar o cadastro.";

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const hasExistingVerification = [
    "pending",
    "processing",
    "manual_review",
    "approved",
  ].includes(existingStatus);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
          <p className="text-sm text-zinc-400">
            Carregando sua validação...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <header className="mb-8 text-center">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <div className="mt-6 flex items-center">
            <p className="text-sm font-medium text-orange-400">
              Etapa {STEP_NUMBER} de {TOTAL_STEPS}
            </p>
          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={STEP_NUMBER}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < STEP_NUMBER ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            Validação de identidade
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Envie seu documento e uma selfie para iniciar sua validação
            profissional.
          </p>
        </header>

        {hasExistingVerification ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
              ✓
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Identidade já enviada
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Sua solicitação de validação já está registrada no sistema.
            </p>

            <p className="mt-3 text-xs text-zinc-500">
              Status: {existingStatus}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="button"
                variant="professional"
                fullWidth
                onClick={continueWithExistingVerification}
                disabled={submitting}
              >
                {submitting ? "Aguarde..." : "Continuar"}
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <label
              htmlFor="document-type"
              className="text-sm font-medium text-zinc-200"
            >
              Tipo de documento
            </label>

            <select
              id="document-type"
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value as DocumentType);
                setError("");
                setMessage("");
              }}
              disabled={submitting}
              className="mt-2 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-base text-white outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            >
              {DOCUMENT_TYPES.map((document) => (
                <option key={document.value} value={document.value}>
                  {document.label}
                </option>
              ))}
            </select>

            {documentType === "cnh" && (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Você pode utilizar sua CNH, que contém o CPF, para realizar
                a identificação.
              </p>
            )}

            {documentType === "passport" && (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Para passaporte, envie a página principal com seus dados e
                uma selfie.
              </p>
            )}

            <label
              htmlFor="document-number"
              className="mt-5 block text-sm font-medium text-zinc-200"
            >
              Número do documento
            </label>

            <input
              id="document-number"
              name="documentNumber"
              type="text"
              autoComplete="off"
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              disabled={submitting}
              placeholder="Digite o número do documento"
              className="mt-2 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />

            <div className="mt-6">
              <p className="text-sm font-medium text-zinc-200">
                {documentType === "passport"
                  ? "Página principal do passaporte"
                  : "Frente do documento"}
              </p>

              <label
                htmlFor="document-front"
                className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold transition hover:border-orange-500"
              >
                {frontFile
                  ? "Alterar documento"
                  : documentType === "passport"
                    ? "Escolher página principal"
                    : "Escolher frente"}
              </label>

              <input
                id="document-front"
                name="documentFront"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => handleImageChange(event, "front")}
                disabled={submitting}
                className="hidden"
              />

              {frontPreview && (
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frontPreview}
                    alt="Pré-visualização do documento"
                    className="max-h-56 w-full object-contain"
                  />
                </div>
              )}
            </div>

            {documentType !== "passport" && (
              <div className="mt-6">
                <p className="text-sm font-medium text-zinc-200">
                  Verso do documento
                </p>

                <label
                  htmlFor="document-back"
                  className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold transition hover:border-orange-500"
                >
                  {backFile ? "Alterar verso" : "Escolher verso"}
                </label>

                <input
                  id="document-back"
                  name="documentBack"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleImageChange(event, "back")}
                  disabled={submitting}
                  className="hidden"
                />

                {backPreview && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={backPreview}
                      alt="Pré-visualização do verso do documento"
                      className="max-h-56 w-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm font-medium text-zinc-200">Selfie</p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Tire uma foto nítida do seu rosto, sem acessórios que
                dificultem sua identificação.
              </p>

              <label
                htmlFor="identity-selfie"
                className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold transition hover:border-orange-500"
              >
                {selfieFile ? "Alterar selfie" : "Escolher selfie"}
              </label>

              <input
                id="identity-selfie"
                name="identitySelfie"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={(event) => handleImageChange(event, "selfie")}
                disabled={submitting}
                className="hidden"
              />

              {selfiePreview && (
                <div className="mx-auto mt-4 h-40 w-40 overflow-hidden rounded-full border-2 border-orange-500/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selfiePreview}
                    alt="Pré-visualização da selfie"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Formatos aceitos: JPG, PNG ou WEBP. Cada imagem pode ter até
              8 MB.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                aria-live="polite"
                className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
              >
                {message}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="button"
                variant="professional"
                fullWidth
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Enviando documentos..." : "Enviar para validação"}
              </Button>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Os documentos são armazenados em ambiente privado e utilizados no
          processo de validação da identidade profissional.
        </p>
      </div>
    </main>
  );
}
