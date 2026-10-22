"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfessionalOnboardingRoute } from "@/lib/professional-onboarding";

type LoginMode = "client" | "professional";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<LoginMode>(() =>
    searchParams.get("role") === "professional"
      ? "professional"
      : "client",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isProfessional = mode === "professional";

  async function resolveProfessionalDestination(userId: string) {
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("professional_onboarding_step")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
      throw new Error(
        "Não foi possível verificar o andamento do seu cadastro profissional.",
      );
    }

    const storedStep = Number(
      profile.professional_onboarding_step ?? 1,
    );

    if (storedStep >= 10) {
      return "/profissional";
    }

    const { data: address, error: addressError } =
      await supabase
        .from("addresses")
        .select("id")
        .eq("profile_id", userId)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

    if (addressError) {
      throw new Error(
        "Não foi possível verificar seu endereço profissional.",
      );
    }

    if (!address) {
      if (storedStep !== 1 && storedStep !== 2) {
        await supabase
          .from("profiles")
          .update({
            professional_onboarding_step: 2,
          })
          .eq("id", userId);
      }

      return "/cadastro-profissional/endereco";
    }

    const { data: profilePhoto, error: photoError } =
      await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

    if (photoError) {
      throw new Error(
        "Não foi possível verificar sua foto de perfil.",
      );
    }

    if (!profilePhoto?.avatar_url) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 3,
        })
        .eq("id", userId);

      return "/cadastro-profissional/foto";
    }

    const {
      data: identityVerification,
      error: identityError,
    } = await supabase
      .from("identity_verifications")
      .select("id, status")
      .eq("profile_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (identityError) {
      throw new Error(
        "Não foi possível verificar sua identidade.",
      );
    }

    const identityCompleted =
      identityVerification &&
      [
        "pending",
        "processing",
        "manual_review",
        "approved",
      ].includes(identityVerification.status);

    if (!identityCompleted) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 4,
        })
        .eq("id", userId);

      return "/cadastro-profissional/identidade";
    }

    const {
      data: professionalService,
      error: servicesError,
    } = await supabase
      .from("professional_services")
      .select("service_id")
      .eq("professional_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (servicesError) {
      throw new Error(
        "Não foi possível verificar suas competências.",
      );
    }

    if (!professionalService) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 5,
        })
        .eq("id", userId);

      return "/cadastro-profissional/competencias";
    }

    const {
      data: professionalPrice,
      error: priceError,
    } = await supabase
      .from("service_prices")
      .select("id")
      .eq("professional_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (priceError) {
      throw new Error(
        "Não foi possível verificar seus preços.",
      );
    }

    if (!professionalPrice) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 6,
        })
        .eq("id", userId);

      return "/cadastro-profissional/precos";
    }

    const {
      data: availability,
      error: availabilityError,
    } = await supabase
      .from("professional_availability")
      .select("id")
      .eq("professional_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (availabilityError) {
      throw new Error(
        "Não foi possível verificar sua disponibilidade.",
      );
    }

    if (!availability) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 7,
        })
        .eq("id", userId);

      return "/cadastro-profissional/disponibilidade";
    }

    const {
      data: region,
      error: regionError,
    } = await supabase
      .from("professional_regions")
      .select("id")
      .eq("professional_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (regionError) {
      throw new Error(
        "Não foi possível verificar sua área de atendimento.",
      );
    }

    if (!region) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 8,
        })
        .eq("id", userId);

      return "/cadastro-profissional/area-atendimento";
    }

    if (storedStep < 9) {
      await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: 9,
        })
        .eq("id", userId);

      return "/cadastro-profissional/plano";
    }

    return getProfessionalOnboardingRoute(storedStep);
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("user_type, status")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Não foi possível carregar o perfil da sua conta.");
        return;
      }

      if (profile.status === "blocked") {
        await supabase.auth.signOut();
        setError("Sua conta está bloqueada. Entre em contato com a VemGO.");
        return;
      }

      if (isProfessional && profile.user_type === "client") {
        await supabase.auth.signOut();
        setError("Esta é uma conta de cliente. Selecione Cliente para entrar.");
        return;
      }

      if (!isProfessional && profile.user_type === "professional") {
        await supabase.auth.signOut();
        setError("Esta é uma conta de profissional. Selecione Profissional para entrar.");
        return;
      }

      if (profile.user_type === "professional") {
        try {
          const destination = await resolveProfessionalDestination(data.user.id);
          router.replace(destination);
          return;
        } catch (destinationError) {
          await supabase.auth.signOut();
          setError(
            destinationError instanceof Error
              ? destinationError.message
              : "Não foi possível verificar seu cadastro profissional.",
          );
          return;
        }
      }

      if (profile.user_type === "company") {
        setError(
          "Contas empresariais ainda não estão disponíveis nesta versão da VemGO.",
        );
        await supabase.auth.signOut();
        return;
      }

      if (profile.user_type === "admin") {
        await supabase.auth.signOut();
        setError(
          "Esta é uma conta administrativa. Utilize o acesso exclusivo da equipe VemGO.",
        );
        return;
      }

      router.replace("/cliente");
    } catch {
      try {
        await supabase.auth.signOut();
      } catch {
        // The user remains on the login page if session cleanup is unavailable.
      }
      setError("Não foi possível concluir o acesso agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05070b] px-6 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-16rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_58%)]" />
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

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-[2.1rem]">
            {isProfessional
              ? "Área do profissional"
              : "Entrar"}
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            {isProfessional
              ? "Acesse sua conta profissional VemGO."
              : "Acesse sua conta VemGO."}
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-[#0b0f17]/80 p-1.5 shadow-lg shadow-black/20">
          <p className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Entrar como
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode("client");
                setError("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                !isProfessional
                  ? "bg-emerald-600 text-black shadow-lg"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
              aria-pressed={!isProfessional}
            >
              Cliente
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("professional");
                setError("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                isProfessional
                  ? "bg-orange-500 text-black shadow-lg"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
              aria-pressed={isProfessional}
            >
              Profissional
            </button>
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className={`rounded-3xl border bg-[#0b0f17]/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 backdrop-blur-xl sm:p-7 ${
            isProfessional
              ? "border-orange-400/20 ring-orange-500/10"
              : "border-emerald-400/20 ring-emerald-500/10"
          }`}
        >
          <div>
            <label
              htmlFor="email"
              className="text-sm font-semibold text-zinc-200"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              aria-invalid={Boolean(error)}
              className={`mt-2 w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none transition focus:ring-4 ${
                isProfessional
                  ? "focus:border-orange-400/80 focus:ring-orange-500/10"
                  : "focus:border-emerald-400/80 focus:ring-emerald-500/10"
              }`}
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-zinc-200"
            >
              Senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              aria-invalid={Boolean(error)}
              className={`mt-2 w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none transition focus:ring-4 ${
                isProfessional
                  ? "focus:border-orange-400/80 focus:ring-orange-500/10"
                  : "focus:border-emerald-400/80 focus:ring-emerald-500/10"
              }`}
            />
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-6 w-full rounded-xl px-5 py-3 font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isProfessional
                ? "bg-orange-400 hover:bg-orange-300 focus-visible:ring-orange-400"
                : "bg-emerald-400 hover:bg-emerald-300 focus-visible:ring-emerald-400"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f17]`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-4 text-center">
            <Link
              href="/recuperar-senha"
              className={`text-sm font-medium ${
                isProfessional
                  ? "text-orange-400 hover:text-orange-300"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          <p>Ainda não possui conta?</p>

          <button
            type="button"
            onClick={() =>
              router.push(
                isProfessional
                  ? "/cadastro-profissional"
                  : "/cadastro",
              )
            }
            className={`mt-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070b] font-semibold ${
              isProfessional
                  ? "text-orange-400 hover:text-orange-300 focus-visible:ring-orange-400"
                  : "text-emerald-400 hover:text-emerald-300 focus-visible:ring-emerald-400"
            }`}
          >
            {isProfessional
              ? "Criar conta profissional →"
              : "Criar conta de cliente →"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="text-sm text-zinc-400">
            Carregando...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
