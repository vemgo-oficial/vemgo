
"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CadastroProfissionalFotoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          setError("Não foi possível carregar os dados do seu perfil.");
          setLoading(false);
          return;
        }

        const avatarPath = profile?.avatar_url ?? "";

        if (avatarPath) {
          setCurrentAvatarUrl(avatarPath);

          if (/^https?:\/\//i.test(avatarPath)) {
            setCurrentImageUrl(avatarPath);
          } else {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("profile-photos")
                .createSignedUrl(avatarPath, 60 * 60);

            if (cancelled) return;

            if (!signedError && signedData?.signedUrl) {
              setCurrentImageUrl(signedData.signedUrl);
            } else {
              setError(
                "A foto está cadastrada, mas não foi possível carregar sua imagem. Você pode selecionar outra foto para substituí-la.",
              );
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar seu perfil. Tente novamente.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Escolha uma imagem JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("A foto precisa ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    if (!selectedFile) {
      setError(
        currentAvatarUrl
          ? "Sua foto já está cadastrada. Escolha outra somente se desejar substituí-la."
          : "Selecione uma foto para continuar.",
      );
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const fileExtension =
        selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${userId}/profile.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        setError(`Não foi possível enviar a foto: ${uploadError.message}`);
        return;
      }

      const { error: avatarError } = await supabase.rpc(
        "set_profile_avatar_url",
        {
          p_avatar_url: filePath,
        },
      );

      if (avatarError) {
        setError(
          `A foto foi enviada, mas não foi possível atualizar o perfil: ${avatarError.message}`,
        );
        return;
      }

      const { data: signedData } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(filePath, 60 * 60);

      const savedImageUrl = signedData?.signedUrl ?? previewUrl;

      setCurrentAvatarUrl(filePath);
      setCurrentImageUrl(savedImageUrl);
      setMessage("Foto salva com sucesso.");
      setSelectedFile(null);
      setPreviewUrl("");

      const input = document.getElementById(
        "profile-photo",
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      window.setTimeout(() => {
        router.push("/cadastro-profissional/identidade");
      }, 1200);
    } catch {
      setError(
        "Ocorreu um erro inesperado ao salvar sua foto. Tente novamente.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSkip() {
    if (currentAvatarUrl) {
      router.push("/cadastro-profissional/identidade");
      return;
    }

    setError("A foto de perfil é obrigatória para continuar.");
  }

  const displayImageUrl = previewUrl || currentImageUrl;

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
              Etapa 3 de 9
            </p>
          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={1}
            aria-valuemax={9}
            aria-valuenow={3}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < 3 ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Sua foto de perfil
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Use uma foto recente e nítida. Ela será utilizada para
            identificar seu perfil profissional na VemGO.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Carregando sua foto...
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-900">
                  {displayImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImageUrl}
                      alt="Foto de perfil profissional"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="px-5 text-center text-sm text-zinc-500">
                      Sua foto aparecerá aqui
                    </div>
                  )}
                </div>
              </div>

              {currentAvatarUrl && !previewUrl && (
                <div className="mt-4 rounded-xl border border-green-900/60 bg-green-950/30 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-green-400">
                    Foto já cadastrada
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Sua foto está salva. Se quiser trocá-la, selecione
                    uma nova imagem abaixo.
                  </p>
                </div>
              )}

              {previewUrl && (
                <p className="mt-4 text-center text-sm text-orange-300">
                  Nova foto selecionada. Ao salvar, ela substituirá a
                  foto atual.
                </p>
              )}

              <label
                htmlFor="profile-photo"
                className="mt-6 flex cursor-pointer items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
              >
                {currentAvatarUrl ? "Escolher outra foto" : "Escolher foto"}
              </label>

              <input
                id="profile-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="mt-3 text-center text-xs text-zinc-500">
                JPG, PNG ou WEBP · máximo 5 MB
              </p>

              {selectedFile && (
                <p className="mt-3 truncate text-center text-xs text-zinc-400">
                  {selectedFile.name}
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400"
                >
                  {message}
                </div>
              )}

              {(!currentAvatarUrl || selectedFile) && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading
                    ? "Enviando foto..."
                    : currentAvatarUrl
                      ? "Substituir foto e continuar"
                      : "Salvar e continuar"}
                </button>
              )}

              {currentAvatarUrl && !selectedFile && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800"
                >
                  Continuar para identidade →
                </button>
              )}

              {!currentAvatarUrl && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={uploading}
                  className="mt-3 w-full px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
                >
                  Continuar sem foto
                </button>
              )}
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Sua foto é armazenada em ambiente privado e vinculada ao seu
          perfil profissional.
        </p>
      </div>
    </main>
  );
}
