"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "O link de recuperação é inválido ou expirou.",
        );
      }

      setChecking(false);
    }

    void checkSession();
  }, [supabase]);

  async function handleUpdatePassword(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError(
        "A senha precisa ter pelo menos 8 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setError(
        `Não foi possível atualizar a senha: ${updateError.message}`,
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Senha alterada com sucesso. Você será direcionado para o login.",
    );

    setLoading(false);

    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-sm text-zinc-400">
          Validando link de recuperação...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            VemGO
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Nova senha
          </h1>

          <p className="mt-2 text-zinc-400">
            Cadastre uma nova senha para sua conta.
          </p>
        </div>

        <form
          onSubmit={handleUpdatePassword}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
        >
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-200"
          >
            Nova senha
          </label>

          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500"
          />

          <p className="mt-2 text-xs text-zinc-500">
            Mínimo de 8 caracteres.
          </p>

          <label
            htmlFor="confirmPassword"
            className="mt-5 block text-sm font-medium text-zinc-200"
          >
            Confirmar nova senha
          </label>

          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            required
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500"
          />

          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(error)}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-black transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Salvando..."
              : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </main>
  );
}