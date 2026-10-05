"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
    6,
    9,
  )}-${numbers.slice(9)}`;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
    7,
  )}`;
}

function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11) return false;

  if (/^(\d)\1+$/.test(cpf)) return false;

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

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedName = name.trim();
    const normalizedCPF = cpf.replace(/\D/g, "");
    const normalizedPhone = phone.replace(/\D/g, "");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setError("Informe seu nome completo.");
      return;
    }

    if (!isValidCPF(normalizedCPF)) {
      setError("Informe um CPF válido.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("Informe um telefone válido.");
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
        "Você precisa aceitar os Termos de Uso do Profissional para continuar.",
      );
      return;
    }

    setLoading(true);

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
      setLoading(false);
      return;
    }

    /*
     * Se o projeto Supabase estiver configurado para não exigir
     * confirmação de e-mail, já teremos uma sessão e podemos
     * avançar diretamente para a Etapa 2.
     */
    if (data.session) {
      router.replace("/cadastro-profissional/endereco");
      return;
    }

    /*
     * Se a confirmação de e-mail estiver habilitada, o usuário
     * precisa confirmar primeiro. O link enviado pelo Supabase
     * apontará para a Etapa 2.
     */
    setMessage(
      "Cadastro criado com sucesso. Enviamos um link de confirmação para seu e-mail. Após confirmar, você será direcionado automaticamente para a Etapa 2 do cadastro profissional.",
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

          <h1 className="mt-6 text-3xl font-bold text-white">
            Cadastro profissional
          </h1>

          <p className="mt-2 text-zinc-400">
            Crie sua conta para fazer parte da rede de
            profissionais VemGO.
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
          <div className="grid grid-cols-2 gap-1">
            <Link
              href="/cadastro"
              className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              Cliente
            </Link>

            <div className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-black">
              Profissional
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-white"
              >
                Nome completo
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="cpf"
                className="mb-2 block text-sm font-medium text-white"
              >
                CPF
              </label>

              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(event) =>
                  setCpf(formatCPF(event.target.value))
                }
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-white"
              >
                Telefone
              </label>

              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(formatPhone(event.target.value))
                }
                placeholder="(14) 99999-9999"
                maxLength={15}
                autoComplete="tel"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white"
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white"
              >
                Senha
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-white"
              >
                Confirmar senha
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm leading-5 text-zinc-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-orange-500"
              />

              <span>
                Li e aceito os{" "}
                <Link
                  href="/termos-profissional"
                  className="font-medium text-orange-400 hover:text-orange-300"
                  target="_blank"
                >
                  Termos de Uso do Profissional
                </Link>{" "}
                e estou ciente da{" "}
                <Link
                  href="/privacidade"
                  className="font-medium text-orange-400 hover:text-orange-300"
                  target="_blank"
                >
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-orange-700 bg-orange-950/40 px-4 py-3 text-sm leading-6 text-orange-300">
                {message}
              </div>
            )}

            {message && (
              <Link
                href="/login?role=professional"
                className="block w-full rounded-xl border border-orange-500 px-4 py-3 text-center font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black"
              >
                Ir para o login profissional
              </Link>
            )}

            {!message && (
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
            className="font-medium text-orange-400 hover:text-orange-300"
          >
            Entrar como profissional
          </Link>
        </p>
      </div>
    </main>
  );
}