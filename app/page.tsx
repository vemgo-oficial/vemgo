"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [need, setNeed] = useState("");
  const [message, setMessage] = useState("");

  function handleSearch() {
    const value = need.trim();

    if (!value) {
      setMessage("Digite o que você precisa resolver.");
      return;
    }

    setMessage(`Recebemos sua necessidade: "${value}"`);
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="h-auto w-[190px] object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
            >
              Entrar
            </button>

            <button
              onClick={() => router.push("/cadastro")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-89px)] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
        </span>

        <h2 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          O que você precisa resolver hoje?
        </h2>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
          Conte o que você precisa. A VemGO identifica o serviço e conecta
          você a profissionais compatíveis.
        </p>

        <div className="mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={need}
            onChange={(event) => setNeed(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Ex.: minha torneira está vazando"
            className="h-14 flex-1 rounded-xl border border-zinc-300 px-5 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <button
            onClick={handleSearch}
            className="h-14 rounded-xl bg-emerald-700 px-8 font-semibold text-white transition hover:bg-emerald-800"
          >
            Encontrar serviço
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-xl bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-5">
            <p className="font-semibold">
              1. Conte sua necessidade
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Explique o que precisa resolver.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 p-5">
            <p className="font-semibold">
              2. Encontre o serviço
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              A VemGO organiza sua necessidade.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 p-5">
            <p className="font-semibold">
              3. Escolha um profissional
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Veja profissionais compatíveis.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}