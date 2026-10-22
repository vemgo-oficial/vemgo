
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function formatCPF(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 3) return numbers;

  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }

  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  }

  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) return numbers;

  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let remainder = (sum * 10) % 11;

  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  remainder = (sum * 10) % 11;

  if (remainder === 10) remainder = 0;

  return remainder === Number(cpf[10]);
}

const inputClassName =
  "h-12 w-full rounded-xl border border-white/10 bg-[#080b09]/80 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-orange-500/70 focus:ring-4 focus:ring-orange-500/10";

const labelClassName =
  "mb-2 block text-sm font-medium text-zinc-200";

export default function CadastroProfissionalPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedName = name.trim();
    const normalizedCPF = cpf.replace(/\D/g, "");
    const normalizedPhone = phone.replace(/\D/g, "");
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 3) {
      setError("Informe seu nome completo.");
      return;
    }

    if (!isValidCPF(normalizedCPF)) {
      setError("Informe um CPF válido.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("Informe um telefone válido com DDD.");
      return;
    }

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
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
        "Você precisa aceitar os Termos de Uso do Profissional e a Política de Privacidade para continuar.",
      );
      return;
    }

    setLoading(true);

    try {
      const onboardingUrl =
        `${window.location.origin}/cadastro-profissional/endereco`;

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: onboardingUrl,
            data: {
              full_name: normalizedName,
              user_type: "professional",
              cpf: normalizedCPF,
              phone: normalizedPhone,
              accepted_terms: true,
            },
          },
        });

      if (signupError) {
        setError(
          `Não foi possível criar o cadastro: ${signupError.message}`,
        );
        return;
      }

      if (data.session) {
        router.replace("/cadastro-profissional/endereco");
        return;
      }

      setMessage(
        "Cadastro criado com sucesso! Enviamos um link de confirmação para seu e-mail. Confirme seu endereço eletrônico para continuar para a etapa de endereço.",
      );
    } catch {
      setError(
        "Ocorreu um erro inesperado ao criar seu cadastro. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#080b09] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-orange-500/[0.09] blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.045] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.035),transparent_55%)]" />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        {/* Cabeçalho padronizado do cadastro profissional */}
        <header className="mb-8">
          <div className="text-center">
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              className="mx-auto h-auto w-[190px] object-contain"
              priority
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-orange-400">
              Etapa 1 de 9
            </p>

          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro profissional"
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={1}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 min-w-0 flex-1 rounded-full ${
                  index < 1 ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </header>

        {/* Introdução */}
        <section className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-400">
            Vamos começar
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2.1rem]">
            Cadastro profissional
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Crie sua conta para fazer parte da rede de profissionais
            VemGO e começar seu cadastro.
          </p>
        </section>

        {/* Alternância entre cadastro de cliente e profissional */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-[#0b0f17]/80 p-1.5 shadow-lg shadow-black/20">
          <div className="grid grid-cols-2 gap-1">
            <Link
              href="/cadastro"
              className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Cliente
            </Link>

            <div
              aria-current="page"
              className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-bold text-black shadow-lg"
            >
              Profissional
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSignup}
          className="rounded-3xl border border-white/[0.09] bg-[#0b0f17]/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/[0.08] backdrop-blur-xl sm:p-7"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className={labelClassName}>
                Nome completo
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Digite seu nome completo"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label htmlFor="cpf" className={labelClassName}>
                CPF
              </label>

              <input
                id="cpf"
                name="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(event) =>
                  setCpf(formatCPF(event.target.value))
                }
                placeholder="000.000.000-00"
                maxLength={14}
                autoComplete="off"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClassName}>
                Telefone com DDD
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(formatPhone(event.target.value))
                }
                placeholder="(11) 99999-9999"
                maxLength={15}
                autoComplete="tel"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClassName}>
                E-mail
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClassName}>
                Senha
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className={labelClassName}
              >
                Confirmar senha
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
                minLength={8}
                className={inputClassName}
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                required
              />

              <span>
                Li e aceito os{" "}
                <Link
                  href="/termos-profissional"
                  className="font-medium text-orange-400 underline-offset-4 hover:text-orange-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Termos de Uso do Profissional
                </Link>{" "}
                e estou ciente da{" "}
                <Link
                  href="/privacidade"
                  className="font-medium text-orange-400 underline-offset-4 hover:text-orange-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {/* Erro sempre em vermelho */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
              >
                {error}
              </div>
            )}

            {/* Confirmação sempre em verde */}
            {message && (
              <div
                role="status"
                className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-400"
              >
                {message}
              </div>
            )}

            {message ? (
              <Link
                href="/login?role=professional"
                className="block w-full rounded-xl border border-orange-500 px-4 py-3 text-center font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black"
              >
                Ir para o login profissional
              </Link>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Criando cadastro..." : "Criar cadastro"}
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já possui uma conta?{" "}
          <Link
            href="/login?role=professional"
            className="font-medium text-orange-400 transition hover:text-orange-300"
          >
            Entrar como profissional
          </Link>
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Seus dados são utilizados para criar e administrar seu
          cadastro profissional na VemGO.
        </p>
      </div>
    </main>
  );
}
