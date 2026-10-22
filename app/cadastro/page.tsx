"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setError("Informe seu nome completo.");
      return;
    }

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (!acceptedTerms) {
      setError(
        "É necessário aceitar os Termos de Uso e estar ciente da Política de Privacidade.",
      );
      return;
    }

    setLoading(true);

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            user_type: "client",
            accepted_terms: true,
          },
        },
      });

      if (signupError) {
        setError(`Não foi possível criar a conta: ${signupError.message}`);
        return;
      }

      setMessage(
        "Cadastro iniciado com sucesso. Confira seu e-mail, se a confirmação estiver habilitada, e depois entre na VemGO.",
      );

      window.setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch {
      setError("Ocorreu um erro inesperado ao criar sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleProfessionalSignup() {
    router.push("/cadastro-profissional");
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#080b09] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-emerald-500/[0.09] blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[500px] w-[500px] rounded-full bg-orange-500/[0.045] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.035),transparent_55%)]" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0c100d]/90 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-[0.92fr_1.08fr]">
          {/* Painel visual */}
          <aside className="relative hidden min-h-full flex-col justify-between overflow-hidden border-r border-white/10 bg-[#090b0a] p-10 lg:flex xl:p-12">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(16,185,129,0.07),transparent_45%),linear-gradient(145deg,rgba(255,255,255,0.02),transparent_60%)]"
            />
            <div className="relative">
              <Link href="/" aria-label="VemGO - Início" className="inline-flex rounded-lg bg-black p-3">
                <Image
                  src="/logo-vemgo-transparente.png"
                  alt="VemGO"
                  width={1751}
                  height={465}
                  priority
                  className="h-auto w-[170px] object-contain"
                />
              </Link>

              <p className="mt-16 text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">
                Sua rotina, mais simples
              </p>
              <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-5xl">
                Precisou?
                <span className="mt-2 block whitespace-nowrap text-white">
                  Chama que <span className="text-emerald-400">vem!</span>
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-zinc-400">
                Crie sua conta para organizar suas necessidades e encontrar
                serviços pela plataforma VemGO.
              </p>
            </div>

            <div className="relative mt-12 space-y-4">
              {[
                "Um só lugar para começar",
                "Seus serviços organizados",
                "Mais praticidade no dia a dia",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
              <div className="pt-8 text-xs text-zinc-600">
                Serviço rápido. Preço certo. Chama que vem!
              </div>
            </div>
          </aside>

          {/* Formulário */}
          <section className="p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
              <Link href="/" aria-label="VemGO - Início" className="inline-flex rounded-lg bg-black p-2">
                <Image
                  src="/logo-vemgo-transparente.png"
                  alt="VemGO"
                  width={1751}
                  height={465}
                  priority
                  className="h-auto w-[135px] object-contain"
                />
              </Link>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                Área do cliente
              </span>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Comece por aqui
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Criar conta
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Preencha os dados básicos para criar seu acesso. As
                  informações necessárias para solicitar serviços serão
                  completadas depois, dentro da sua área do cliente.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-300">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                    Cliente
                  </div>
                  <button
                    type="button"
                    onClick={handleProfessionalSignup}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-orange-300"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4" />
                    </svg>
                    Profissional
                  </button>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-200">
                    Nome completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Como podemos chamar você?"
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-200">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="voce@exemplo.com"
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-200">
                      Senha
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo de 8 caracteres"
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-zinc-200">
                      Confirmar senha
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                      placeholder="Repita sua senha"
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      required
                      className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
                    />
                    <span className="text-xs leading-5 text-zinc-400">
                      Li e aceito os{" "}
                      <Link
                        href="/termos"
                        target="_blank"
                        className="font-semibold text-emerald-400 transition hover:text-emerald-300"
                      >
                        Termos de Uso
                      </Link>{" "}
                      e estou ciente da{" "}
                      <Link
                        href="/privacidade"
                        target="_blank"
                        className="font-semibold text-emerald-400 transition hover:text-emerald-300"
                      >
                        Política de Privacidade
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm leading-6 text-red-300"
                  >
                    {error}
                  </div>
                )}

                {message && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm leading-6 text-emerald-300"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#06100a] shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c100d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Criando sua conta..." : "Criar conta de cliente"}
                  {!loading && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-white/[0.08] pt-6 text-center text-sm text-zinc-400">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-emerald-400 transition hover:text-emerald-300"
                >
                  Entrar
                </Link>
              </div>

              <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
                Este é o cadastro básico de acesso. O preenchimento das
                informações complementares será feito na área do cliente
                antes de solicitar um serviço.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
