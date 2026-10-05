"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CadastroProfissionalPlanoPage() {
  const router = useRouter();

  function handleContinue() {
    router.push("/profissional");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
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

          <p className="mt-6 text-sm font-medium text-orange-400">
            Plano VemGO
            Etapa 9 de 9
          </p>

          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 flex-1 rounded-full bg-orange-500"
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold">
            Seu plano
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Você está entrando na rede de profissionais VemGO.
          </p>
        </div>

        <div className="rounded-2xl border border-orange-500/50 bg-black p-6 shadow-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm font-medium text-orange-400">
              PLANO MVP
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              VemGO Profissional
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Durante o MVP, o profissional poderá fazer parte
              da rede VemGO e receber oportunidades compatíveis
              com seus serviços, região e disponibilidade.
            </p>

            <div className="mt-5 border-t border-zinc-800 pt-5">
              <p className="text-3xl font-bold">
                Gratuito
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Condição inicial do MVP
              </p>
            </div>

            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              <div className="flex gap-3">
                <span className="text-orange-400">✓</span>
                <span>Perfil profissional na rede VemGO</span>
              </div>

              <div className="flex gap-3">
                <span className="text-orange-400">✓</span>
                <span>Serviços e competências cadastrados</span>
              </div>

              <div className="flex gap-3">
                <span className="text-orange-400">✓</span>
                <span>Área de atendimento definida</span>
              </div>

              <div className="flex gap-3">
                <span className="text-orange-400">✓</span>
                <span>Recebimento de oportunidades compatíveis</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400"
          >
            Continuar →
          </button>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          As condições comerciais da VemGO poderão ser
          atualizadas futuramente.
        </p>
      </div>
    </main>
  );
}