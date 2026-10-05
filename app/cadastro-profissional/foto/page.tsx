"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function CadastroProfissionalFotoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        setError(
          "Não foi possível carregar os dados do seu perfil.",
        );
        setLoading(false);
        return;
      }

      if (profile?.avatar_url) {
        setCurrentAvatarUrl(profile.avatar_url);
      }

      setLoading(false);
    }

    void loadProfile();
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setError("");
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Escolha uma imagem JPG, PNG ou WEBP.",
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "A foto precisa ter no máximo 5 MB.",
      );
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(newPreviewUrl);
  }

  async function handleUpload() {
    if (!userId) {
      setError("Usuário não identificado.");
      return;
    }

    if (!selectedFile) {
      setError("Selecione uma foto para continuar.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const fileExtension =
      selectedFile.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const filePath = `${userId}/profile.${fileExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: selectedFile.type,
        });

    if (uploadError) {
      setError(
        `Não foi possível enviar a foto: ${uploadError.message}`,
      );
      setUploading(false);
      return;
    }

    const { error: avatarError } =
      await supabase.rpc(
        "set_profile_avatar_url",
        {
          p_avatar_url: filePath,
        },
      );

    if (avatarError) {
      await supabase.storage
        .from("profile-photos")
        .remove([filePath]);

      setError(
        `A foto foi enviada, mas não foi possível atualizar o perfil: ${avatarError.message}`,
      );
      setUploading(false);
      return;
    }

    setCurrentAvatarUrl(filePath);
    setMessage("Foto salva com sucesso.");
    setUploading(false);

    setTimeout(() => {
      router.push("/cadastro-profissional/identidade");
    }, 800);
  }

  function handleSkip() {
    setError(
      "A foto de perfil é obrigatória para continuar.",
    );
  }

  function getDisplayImage() {
    if (previewUrl) {
      return previewUrl;
    }

    return "";
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <Image
            src="/logo-vemgo.png"
            alt="VemGO"
            width={360}
            height={200}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <p className="mt-6 text-sm font-medium text-orange-400">
            Etapa 3 de 9
          </p>

          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < 3
                    ? "bg-orange-500"
                    : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Sua foto de perfil
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Use uma foto recente e nítida. Ela será utilizada
            para identificar seu perfil profissional na VemGO.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Carregando seu perfil...
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-900">
                  {getDisplayImage() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getDisplayImage()}
                      alt="Pré-visualização da foto de perfil"
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
                <p className="mt-4 text-center text-xs text-zinc-500">
                  Você já possui uma foto cadastrada. Selecione
                  outra para substituí-la.
                </p>
              )}

              <label
                htmlFor="profile-photo"
                className="mt-6 flex cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-zinc-800"
              >
                Escolher foto
              </label>

              <input
                id="profile-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="mt-3 text-center text-xs text-zinc-500">
                JPG, PNG ou WEBP • máximo 5 MB
              </p>

              {selectedFile && (
                <p className="mt-3 truncate text-center text-xs text-zinc-400">
                  {selectedFile.name}
                </p>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {message && (
                <div className="mt-5 rounded-xl border border-green-900/60 bg-green-950/30 px-4 py-3 text-sm text-green-300">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading
                  ? "Enviando foto..."
                  : "Salvar e continuar"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={uploading}
                className="mt-3 w-full px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
              >
                Continuar sem foto
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Sua foto é armazenada em ambiente privado e
          vinculada ao seu perfil profissional.
        </p>
      </div>
    </main>
  );
}