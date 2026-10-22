"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSent(false);

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        },
      );

      if (resetError) {
        setError(
          "Não foi possível enviar o link de recuperação. Verifique o e-mail informado e tente novamente.",
        );
        return;
      }

      setSent(true);
    } catch {
      setError(
        "Não foi possível enviar o link de recuperação agora. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#05070b] px-4 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_58%)]" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              priority
              className="mx-auto h-auto w-[190px] object-contain"
            />
          </Link>

          <h1 className="mt-8 text-2xl font-bold">
            Recuperar senha
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <Card className="border-white/10 bg-[#0b0f17]/90 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          {sent ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-2xl text-emerald-300">
                ✓
              </div>

              <div>
                <h2 className="text-lg font-semibold" role="status">
                  E-mail enviado
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Se o e-mail informado estiver cadastrado, você receberá
                  um link para redefinir sua senha.
                </p>

                <p className="mt-2 break-all text-sm text-zinc-300">
                  {email}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setError("");
                  }}
                >
                  Enviar novamente
                </Button>

                <Link href="/login" className="block">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                  >
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />

              {error && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-zinc-400 transition hover:text-white"
                >
                  ← Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-600">
          VemGO · Serviço rápido. Preço certo. Chama que vem!
        </p>
      </div>
    </main>
  );
}
