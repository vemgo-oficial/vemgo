"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";


const onboardingRoutes: Record<number, string> = {
  1: "/cadastro-profissional",
  2: "/cadastro-profissional/endereco",
  3: "/cadastro-profissional/foto",
  4: "/cadastro-profissional/identidade",
  5: "/cadastro-profissional/competencias",
  6: "/cadastro-profissional/precos",
  7: "/cadastro-profissional/disponibilidade",
  8: "/cadastro-profissional/area-atendimento",
  9: "/cadastro-profissional/plano",
};

function getNextOnboardingRoute(step: number | null | undefined) {
  if (!step || step < 1) {
    return "/cadastro-profissional";
  }

  if (step >= 10) {
    return "/profissional";
  }

  return onboardingRoutes[step] ?? "/profissional";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<"client" | "professional">(() => searchParams.get("role") === "professional" ? "professional" : "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isProfessional = mode === "professional";


  async function resolveProfessionalDestination(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("professional_onboarding_step")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar o andamento do seu cadastro profissional.",
      );
    }

    const storedStep = Number(profile.professional_onboarding_step ?? 1);

    const { data: address, error: addressError } = await supabase
      .from("addresses")
      .select("id")
      .eq("profile_id", userId)
      .limit(1)
      .maybeSingle();

    if (addressError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar seu endereÃ§o profissional.",
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

    const { data: profilePhoto, error: photoError } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (photoError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar sua foto de perfil.",
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
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (identityError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar sua identidade.",
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
      data: professionalServices,
      error: servicesError,
    } = await supabase
      .from("professional_services")
      .select("id")
      .eq("professional_id", userId)
      .limit(1)
      .maybeSingle();

    if (servicesError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar suas competÃªncias.",
      );
    }

    if (!professionalServices) {
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
      .limit(1)
      .maybeSingle();

    if (priceError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar seus preÃ§os.",
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
      .limit(1)
      .maybeSingle();

    if (availabilityError) {
      throw new Error(
        "NÃ£o foi possÃ­vel verificar sua disponibilidade.",
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
        "NÃ£o foi possÃ­vel verificar sua Ã¡rea de atendimento.",
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

    return getNextOnboardingRoute(storedStep);
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError || !data.user) {
      setError("E-mail ou senha invÃ¡lidos.");
      setLoading(false);
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

      setError(
        "NÃ£o foi possÃ­vel carregar o perfil da sua conta.",
      );

      setLoading(false);
      return;
    }

    if (profile.status === "blocked") {
      await supabase.auth.signOut();

      setError(
        "Sua conta estÃ¡ bloqueada. Entre em contato com a VemGO.",
      );

      setLoading(false);
      return;
    }

    if (
      isProfessional &&
      profile.user_type === "client"
    ) {
      await supabase.auth.signOut();

      setError(
        "Esta Ã© uma conta de cliente. Selecione Cliente para entrar.",
      );

      setLoading(false);
      return;
    }

    if (
      !isProfessional &&
      profile.user_type === "professional"
    ) {
      await supabase.auth.signOut();

      setError(
        "Esta Ã© uma conta de profissional. Selecione Profissional para entrar.",
      );

      setLoading(false);
      return;
    }

    if (profile.user_type === "professional") {
      try {
        const destination =
          await resolveProfessionalDestination(
            data.user.id,
          );

        router.replace(destination);
        return;
      } catch (destinationError) {
        await supabase.auth.signOut();

        setError(
          destinationError instanceof Error
            ? destinationError.message
            : "NÃ£o foi possÃ­vel verificar seu cadastro profissional.",
        );

        setLoading(false);
        return;
      }
    }

    if (profile.user_type === "company") {
      router.replace("/empresa");
      return;
    }

    if (profile.user_type === "admin") {
      router.replace("/controle");
      return;
    }

    router.replace("/cliente");
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
            {isProfessional
              ? "Ãrea do profissional"
              : "Entrar"}
          </h1>

          <p className="mt-2 text-zinc-400">
            {isProfessional
              ? "Acesse sua conta profissional VemGO."
              : "Acesse sua conta VemGO."}
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5">
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
              }`}
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
              }`}
            >
              Profissional
            </button>
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className={`rounded-2xl border bg-zinc-900/40 p-6 ${
            isProfessional
              ? "border-orange-500/30"
              : "border-emerald-500/20"
          }`}
        >
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-200"
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
              style={{
                outline: "none",
                boxShadow: "none",
              }}
              className={`mt-2 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white shadow-none transition !outline-none !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 ${
                isProfessional
                  ? "focus:border-orange-500 focus-visible:border-orange-500"
                  : "focus:border-emerald-500 focus-visible:border-emerald-500"
              }`}
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
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              style={{
                outline: "none",
                boxShadow: "none",
              }}
              className={`mt-2 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white shadow-none transition !outline-none !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 ${
                isProfessional
                  ? "focus:border-orange-500 focus-visible:border-orange-500"
                  : "focus:border-emerald-500 focus-visible:border-emerald-500"
              }`}
            />
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-6 w-full rounded-xl px-5 py-3 font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isProfessional
                ? "bg-orange-500 hover:bg-orange-400"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-4 text-center">
            <a
              href="/recuperar-senha"
              className={`text-sm font-medium ${
                isProfessional
                  ? "text-orange-400 hover:text-orange-300"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              Esqueci minha senha
            </a>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          <p>Ainda nÃ£o possui conta?</p>

          <button
            type="button"
            onClick={() =>
              router.push(
                isProfessional
                  ? "/cadastro-profissional"
                  : "/cadastro",
              )
            }
            className={`mt-2 font-semibold ${
              isProfessional
                ? "text-orange-400 hover:text-orange-300"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            {isProfessional
              ? "Criar conta profissional â†’"
              : "Criar conta de cliente â†’"}
          </button>
        </div>
      </div>
    </main>
  );

}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

