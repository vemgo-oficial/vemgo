"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    let active = true;

    async function checkSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (active && (sessionError || !session)) {
          setError("O link de recuperação é inválido ou expirou.");
        }
      } catch {
        if (active) {
          setError("Não foi possível validar o link de recuperação.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
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

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(
          `Não foi possível atualizar a senha: ${updateError.message}`,
        );
        return;
      }

      setMessage(
        "Senha alterada com sucesso. Você será direcionado para o login.",
      );

      window.setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch {
      setError(
        "Não foi possível atualizar a senha agora. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#080b09] px-6 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.10),transparent_55%)]" />
        <p role="status" className="text-sm text-zinc-400">
          Validando link de recuperação...
        </p>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#080b09] px-4 py-10 text-white sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-emerald-500/[0.09] blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[500px] w-[500px] rounded-full bg-orange-500/[0.045] blur-[140px]" />
      </div>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <Link href="/" aria-label="VemGO - Início" className="inline-flex rounded-lg bg-black p-2">
            <Image src="/logo-vemgo-transparente.png" alt="VemGO" width={1751} height={465} priority className="h-auto w-[145px] object-contain" />
          </Link>

          <h1 className="mt-6 text-3xl font-bold">
            Nova senha
          </h1>

          <p className="mt-2 text-zinc-400">
            Cadastre uma nova senha para sua conta.
          </p>
        </div>

        <form
          onSubmit={handleUpdatePassword}
          className="rounded-2xl border border-white/10 bg-[#0c100d]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
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
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
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
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
          />

          {error && (
            <div role="alert" aria-live="polite" className="mt-5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(error)}
            className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-[#06100a] transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c100d] disabled:cursor-not-allowed disabled:opacity-50"
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
