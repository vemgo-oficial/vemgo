
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const TOTAL_STEPS = 9;
const COMPLETED_STEP = 10;

export default function CadastroProfissionalPlanoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?role=professional");
        return;
      }

      const { data: profile, error: updateError } = await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: COMPLETED_STEP,
        })
        .eq("id", user.id)
        .eq("user_type", "professional")
        .select("id, professional_onboarding_step")
        .maybeSingle();

      if (updateError) {
        setError(
          `Não foi possível concluir seu cadastro: ${updateError.message}`,
        );
        return;
      }

      if (
        !profile ||
        Number(profile.professional_onboarding_step) !== COMPLETED_STEP
      ) {
        setError(
          "Não foi possível confirmar a conclusão do cadastro. Verifique as permissões de atualização do seu perfil no Supabase e tente novamente.",
        );
        return;
      }

      router.replace("/profissional");
    } catch {
      setError(
        "Ocorreu um erro inesperado ao concluir seu cadastro. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <header className="mb-8 text-center">
          <Image
            src="/logo-vemgo-transparente.png"
            alt="VemGO"
            width={1751}
            height={465}
            className="mx-auto h-auto w-[190px] object-contain"
            priority
          />

          <div className="mt-6 flex items-center">
            <p className="text-sm font-medium text-orange-400">
              Etapa {TOTAL_STEPS} de {TOTAL_STEPS}
            </p>
          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={TOTAL_STEPS}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 flex-1 rounded-full bg-orange-500"
              />
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            Seu plano
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Você está entrando na rede de profissionais VemGO.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm sm:p-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-semibold tracking-wider text-orange-400">
              PLANO MVP
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              VemGO Profissional
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Durante o MVP, você poderá fazer parte da rede VemGO e
              receber oportunidades compatíveis com seus serviços,
              sua região e sua disponibilidade.
            </p>

            <div className="mt-5 border-t border-zinc-800 pt-5">
              <p className="text-3xl font-bold">Gratuito</p>
              <p className="mt-1 text-xs text-zinc-500">
                Condição inicial do MVP
              </p>
            </div>

            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              {[
                "Perfil profissional na rede VemGO",
                "Serviços e competências cadastrados",
                "Área de atendimento definida",
                "Possibilidade de receber oportunidades compatíveis",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="font-bold text-orange-400"
                  >
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Concluindo..." : "Concluir cadastro"}
          </button>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          As condições comerciais da VemGO poderão ser atualizadas
          futuramente, conforme as regras da plataforma.
        </p>
      </div>
    </main>
  );
}
