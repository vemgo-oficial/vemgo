"use client";

import Image from "next/image";
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

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

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

    const { error: signupError } =
      await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            user_type: "client",
          },
        },
      });

    if (signupError) {
      setError(
        `Não foi possível criar a conta: ${signupError.message}`,
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Conta criada com sucesso. Você já pode entrar na VemGO.",
    );

    setLoading(false);

    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  }

  function handleProfessionalSignup() {
    router.push("/cadastro-profissional");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
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

          <h1 className="mt-6 text-3xl font-bold">
            Criar conta
          </h1>

          <p className="mt-2 text-zinc-400">
            Escolha como você deseja usar a VemGO.
          </p>
        </div>

        {/* Alternância de perfil */}
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5">
          <p className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Criar conta como
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-black shadow-lg"
            >
              Cliente
            </button>

            <button
              type="button"
              onClick={handleProfessionalSignup}
              className="rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 transition hover:bg-zinc-800 hover:text-orange-400"
            >
              Profissional
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-2xl border border-emerald-500/20 bg-zinc-900/40 p-6"
        >
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-zinc-200"
            >
              Nome completo
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="Seu nome completo"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
            />
          </div>

          <div className="mt-5">
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
              placeholder="seu@email.com"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-200"
            >
              Senha
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
              placeholder="Mínimo de 8 caracteres"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-zinc-200"
            >
              Confirmar senha
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
              placeholder="Digite a senha novamente"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
            />
          </div>

          {/* Termos e privacidade */}
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
              />

              <span className="text-sm leading-6 text-zinc-400">
                Li e aceito os{" "}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Termos de Uso
                </a>{" "}
                da VemGO e estou ciente da{" "}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Política de Privacidade
                </a>
                .
              </span>
            </label>
          </div>

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
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          <p>
            Já tem uma conta?{" "}
            <a
              href="/login"
              className="font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Entrar
            </a>
          </p>

          <p className="mt-4">
            Quer trabalhar com a VemGO?{" "}
            <button
              type="button"
              onClick={handleProfessionalSignup}
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              Cadastro profissional →
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}