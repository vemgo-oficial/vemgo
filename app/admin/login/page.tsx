"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError || !data.user) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, status")
        .eq("id", data.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        profile.user_type !== "admin" ||
        profile.status !== "active"
      ) {
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          setError(
            "Esta conta não tem autorização para acessar a área administrativa, e não foi possível encerrar a sessão. Tente novamente.",
          );
          return;
        }

        setError("Esta conta não tem autorização para acessar a área administrativa.");
        return;
      }

      router.replace("/controle");
    } catch {
      setError("Não foi possível concluir o acesso agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05070b] px-6 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[42rem] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-[-16rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,64,175,0.12),transparent_58%)]" />
      </div>
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-300">
              VemGO Control
            </p>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-[2.1rem]">
            Acesso administrativo
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            Um ambiente exclusivo para administrar e proteger a operação VemGO.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-white/[0.09] bg-[#0b0f17]/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-blue-500/[0.08] backdrop-blur-xl sm:p-7"
        >
          <div>
            <label htmlFor="admin-email" className="text-sm font-semibold text-zinc-200">
              E-mail administrativo
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none transition duration-200 focus:border-blue-400/80 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="mt-5">
            <label htmlFor="admin-password" className="text-sm font-semibold text-zinc-200">
              Senha
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none transition duration-200 focus:border-blue-400/80 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl border border-blue-300/20 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-3.5 font-bold text-white shadow-[0_10px_30px_rgba(37,99,235,0.22)] transition duration-200 hover:-translate-y-0.5 hover:from-blue-600 hover:via-blue-500 hover:to-sky-400 hover:shadow-[0_14px_35px_rgba(37,99,235,0.3)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verificando acesso..." : "Entrar no VemGO Control"}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
            Acesso restrito. Somente contas administrativas ativas podem entrar.
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition hover:text-blue-300"
          >
            ← Voltar ao site público
          </Link>
        </div>
      </div>
    </main>
  );
}
