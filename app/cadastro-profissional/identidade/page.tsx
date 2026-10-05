"use client";

import Image from "next/image";
import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { OnboardingStepper } from "@/components/vemgo/OnboardingStepper";
import { Button } from "@/components/ui/Button";

type DocumentType = "rg" | "cnh" | "passport";

const DOCUMENT_TYPES: {
  value: DocumentType;
  label: string;
}[] = [
  {
    value: "rg",
    label: "RG",
  },
  {
    value: "cnh",
    label: "CPF / CNH",
  },
  {
    value: "passport",
    label: "Passaporte",
  },
];

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function CadastroProfissionalIdentidadePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");

  const [documentType, setDocumentType] =
    useState<DocumentType>("cnh");

  const [documentNumber, setDocumentNumber] =
    useState("");

  const [frontFile, setFrontFile] =
    useState<File | null>(null);

  const [backFile, setBackFile] =
    useState<File | null>(null);

  const [selfieFile, setSelfieFile] =
    useState<File | null>(null);

  const [frontPreview, setFrontPreview] =
    useState("");

  const [backPreview, setBackPreview] =
    useState("");

  const [selfiePreview, setSelfiePreview] =
    useState("");

  const [existingStatus, setExistingStatus] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      setLoading(true);
      setError("");

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

      const { data: verification } = await supabase
        .from("identity_verifications")
        .select("status")
        .eq("profile_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (verification?.status) {
        setExistingStatus(verification.status);
      }

      setLoading(false);
    }

    void loadIdentity();

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
  }, [
    frontPreview,
    backPreview,
    selfiePreview,
  ]);

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

    const validationError =
      validateImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const preview =
      URL.createObjectURL(file);

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

  function sanitizeDocumentNumber(
    value: string,
  ) {
    return value.trim();
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
          upsert: true,
          contentType: file.type,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  }

  async function advanceOnboarding() {
    if (!userId) {
      throw new Error(
        "Usuário não identificado.",
      );
    }

    const { error: onboardingError } =
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 5,
        })
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

    const normalizedNumber =
      sanitizeDocumentNumber(
        documentNumber,
      );

    if (!normalizedNumber) {
      setError(
        "Informe o número do documento.",
      );
      return;
    }

    if (!frontFile) {
      setError(
        "Envie a foto da frente do documento.",
      );
      return;
    }

    if (
      documentType !== "passport" &&
      !backFile
    ) {
      setError(
        "Envie também a foto do verso do documento.",
      );
      return;
    }

    if (!selfieFile) {
      setError(
        "Envie uma selfie para continuar.",
      );
      return;
    }

    if (!userId) {
      setError(
        "Usuário não identificado.",
      );
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

      const selfieExtension =
        selfieFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      frontPath =
        `${userId}/identity/front-${timestamp}.${frontExtension}`;

      selfiePath =
        `${userId}/identity/selfie-${timestamp}.${selfieExtension}`;

      if (documentType !== "passport") {
        const backExtension =
          backFile?.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        backPath =
          `${userId}/identity/back-${timestamp}.${backExtension}`;
      }

      await uploadFile(
        frontFile,
        frontPath,
      );

      if (
        documentType !== "passport" &&
        backFile &&
        backPath
      ) {
        await uploadFile(
          backFile,
          backPath,
        );
      }

      await uploadFile(
        selfieFile,
        selfiePath,
      );

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
          document_back_path:
            backPath || null,
          verification_status: "pending",
        })
        .select("id")
        .single();

      if (
        documentError ||
        !document
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
            document.id,
          verification_type:
            "full_identity",
          status: "pending",
          selfie_path: selfiePath,
        });

      if (verificationError) {
        await supabase.storage
          .from("identity-documents")
          .remove(
            [
              frontPath,
              ...(backPath
                ? [backPath]
                : []),
              selfiePath,
            ],
          );

        throw new Error(
          verificationError.message,
        );
      }

      await advanceOnboarding();

      setMessage(
        "Documentos enviados. Sua identidade está aguardando validação.",
      );

      setTimeout(() => {
        router.push(
          "/cadastro-profissional/competencias",
        );
      }, 900);
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar sua identidade.";

      setError(
        `Não foi possível concluir o envio: ${errorMessage}`,
      );

      setSubmitting(false);
    }
  }

  async function continueWithExistingVerification() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await advanceOnboarding();

      router.push(
        "/cadastro-profissional/competencias",
      );
    } catch (continueError) {
      const errorMessage =
        continueError instanceof Error
          ? continueError.message
          : "Não foi possível continuar o cadastro.";

      setError(errorMessage);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-text-primary">
        <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
          <p className="text-sm text-text-secondary">
            Carregando sua validação…
          </p>
        </div>
      </main>
    );
  }

  if (
    existingStatus === "pending" ||
    existingStatus === "processing" ||
    existingStatus === "manual_review" ||
    existingStatus === "approved"
  ) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-text-primary">
        <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
          <div className="mb-8 text-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="mx-auto h-auto w-47.5 object-contain"
              priority
            />

            <div className="mt-8">
              <OnboardingStepper
                currentStep={4}
                totalSteps={9}
              />
            </div>

            <h1 className="mt-8 text-3xl font-bold tracking-tight">
              Identidade
            </h1>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-vemgo-orange-border bg-vemgo-orange-soft text-2xl text-vemgo-orange">
              ✓
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Identidade já enviada
            </h2>

            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Sua solicitação de validação já está
              registrada no sistema.
            </p>

            <p className="mt-3 text-xs text-text-tertiary">
              Status: {existingStatus}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="button"
                variant="professional"
                size="lg"
                loading={submitting}
                fullWidth
                onClick={
                  continueWithExistingVerification
                }
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-text-primary">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <div className="mb-8">
          <div className="text-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="mx-auto h-auto w-47.5 object-contain"
              priority
            />
          </div>

          <div className="mt-8">
            <OnboardingStepper
              currentStep={4}
              totalSteps={9}
            />
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Validação de identidade
            </h1>

            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Envie seu documento e uma selfie para iniciar
              sua validação profissional.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 shadow-lg">
          <label
            htmlFor="document-type"
            className="text-sm font-medium text-text-primary"
          >
            Tipo de documento
          </label>

          <select
            id="document-type"
            value={documentType}
            onChange={(event) =>
              setDocumentType(
                event.target.value as DocumentType,
              )
            }
            disabled={submitting}
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-surface-2 px-3.5 text-base text-text-primary outline-none transition-colors focus:border-vemgo-orange focus:ring-2 focus:ring-vemgo-orange/20"
          >
            {DOCUMENT_TYPES.map((document) => (
              <option
                key={document.value}
                value={document.value}
              >
                {document.label}
              </option>
            ))}
          </select>

          {documentType === "cnh" && (
            <p className="mt-2 text-xs leading-5 text-text-tertiary">
              Você pode utilizar sua CNH, que contém o CPF,
              para realizar a identificação.
            </p>
          )}

          {documentType === "passport" && (
            <p className="mt-2 text-xs leading-5 text-text-tertiary">
              Para passaporte, envie a página principal com
              seus dados e uma selfie.
            </p>
          )}

          <label
            htmlFor="document-number"
            className="mt-5 block text-sm font-medium text-text-primary"
          >
            Número do documento
          </label>

          <input
            id="document-number"
            name="documentNumber"
            type="text"
            autoComplete="off"
            value={documentNumber}
            onChange={(event) =>
              setDocumentNumber(
                event.target.value,
              )
            }
            disabled={submitting}
            placeholder="Digite o número do documento…"
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-surface-2 px-3.5 text-base text-text-primary outline-none placeholder:text-text-tertiary focus:border-vemgo-orange focus:ring-2 focus:ring-vemgo-orange/20"
          />

          <div className="mt-6">
            <p className="text-sm font-medium text-text-primary">
              {documentType === "passport"
                ? "Página principal do passaporte"
                : "Frente do documento"}
            </p>

            <label
              htmlFor="document-front"
              className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-vemgo-orange focus-within:ring-2 focus-within:ring-vemgo-orange"
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
              onChange={(event) =>
                handleImageChange(
                  event,
                  "front",
                )
              }
              disabled={submitting}
              className="hidden"
            />

            {frontPreview && (
              <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-surface-2">
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
              <p className="text-sm font-medium text-text-primary">
                Verso do documento
              </p>

              <label
                htmlFor="document-back"
                className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-vemgo-orange focus-within:ring-2 focus-within:ring-vemgo-orange"
              >
                {backFile
                  ? "Alterar verso"
                  : "Escolher verso"}
              </label>

              <input
                id="document-back"
                name="documentBack"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleImageChange(
                    event,
                    "back",
                  )
                }
                disabled={submitting}
                className="hidden"
              />

              {backPreview && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-surface-2">
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
            <p className="text-sm font-medium text-text-primary">
              Selfie
            </p>

            <p className="mt-1 text-xs leading-5 text-text-tertiary">
              Tire uma foto nítida do seu rosto, sem
              acessórios que dificultem sua identificação.
            </p>

            <label
              htmlFor="identity-selfie"
              className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-vemgo-orange focus-within:ring-2 focus-within:ring-vemgo-orange"
            >
              {selfieFile
                ? "Alterar selfie"
                : "Escolher selfie"}
            </label>

            <input
              id="identity-selfie"
              name="identitySelfie"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={(event) =>
                handleImageChange(
                  event,
                  "selfie",
                )
              }
              disabled={submitting}
              className="hidden"
            />

            {selfiePreview && (
              <div className="mx-auto mt-4 h-40 w-40 overflow-hidden rounded-full border-2 border-vemgo-orange/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfiePreview}
                  alt="Pré-visualização da selfie"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
            >
              {message}
            </div>
          )}

          <div className="mt-6">
            <Button
              type="button"
              variant="professional"
              size="lg"
              loading={submitting}
              fullWidth
              onClick={handleSubmit}
            >
              Enviar para validação
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-text-tertiary">
          Os documentos são armazenados em ambiente privado
          e utilizados no processo de validação da identidade
          profissional.
        </p>
      </div>
    </main>
  );
}