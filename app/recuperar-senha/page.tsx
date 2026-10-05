"use client";

import Image from "next/image";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RecuperarSenhaPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRecovery(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const redirectTo =
      `${window.location.origin}/redefinir-senha`;

    const { error: recoveryError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        },
      );

    if (recoveryError) {
      setError(
        "Não foi possível enviar o e-mail de recuperação. Verifique o endereço informado.",
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <Image
            src="/logo-vemgo.png"
            alt="VemGO"
            width={360}
            height={200}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <h1 className="mt-6 text-3xl font-bold">
            Recuperar senha
          </h1>

          <p className="mt-2 text-zinc-400">
            Informe seu e-mail para receber o link de recuperação.
          </p>
        </div>

        <form
          onSubmit={handleRecovery}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
        >
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-200"
          >
            E-mail
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
            placeholder="voce@email.com"
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
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-black transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Enviando..."
              : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            ← Voltar para entrar
          </a>
        </div>
      </div>
    </main>
  );
}