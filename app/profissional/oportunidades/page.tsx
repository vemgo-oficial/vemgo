
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Opportunity = {
  match_id: string;
  request_id: string;
  description: string;
  urgency: string;
  request_status: string;
  service_code: string;
  service_name: string;
  price: number | null;
  city: string;
  state: string;
  neighborhood: string;
  match_score: number;
  match_status: string;
  sent_at: string;
};

export default function OportunidadesPage() {
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [name, setName] = useState("Profissional");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunities() {
      const supabase = createSupabaseBrowserClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, user_type, status")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError || !profile) {
          setMessage("Não foi possível validar seu perfil. Entre novamente.");
          setLoading(false);
          return;
        }

        if (profile.status === "blocked") {
          await supabase.auth.signOut();
          if (!cancelled) router.replace("/login");
          return;
        }

        if (profile.user_type !== "professional") {
          if (profile.user_type === "client") {
            router.replace("/cliente");
          } else if (profile.user_type === "admin") {
            router.replace("/controle");
          } else {
            router.replace("/login");
          }
          return;
        }

        const fullName = profile.full_name?.trim() || "";
        const firstName = fullName.split(/\s+/)[0] || "Profissional";
        setName(firstName);

        const storedAvatar = profile.avatar_url?.trim() || "";

        if (storedAvatar) {
          if (/^https?:\/\//i.test(storedAvatar)) {
            setAvatarUrl(storedAvatar);
          } else {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("profile-photos")
                .createSignedUrl(storedAvatar, 3600);

            if (cancelled) return;

            if (!signedError && signedData?.signedUrl) {
              setAvatarUrl(signedData.signedUrl);
            } else {
              setAvatarUrl("");
            }
          }
        } else {
          setAvatarUrl("");
        }

        const { data, error } = await supabase.rpc(
          "get_professional_opportunities",
        );

        if (cancelled) return;

        if (error) {
          setMessage(
            `Não foi possível carregar as oportunidades: ${error.message}`,
          );
          setOpportunities([]);
          setLoading(false);
          return;
        }

        setOpportunities((data || []) as Opportunity[]);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setMessage("Ocorreu um erro inesperado ao carregar as oportunidades.");
          setLoading(false);
        }
      }
    }

    void loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function formatPrice(price: number | null) {
    if (price === null || price === undefined) {
      return "Preço não informado";
    }

    return price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Data não disponível";
    }

    return parsedDate.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          Carregando oportunidades...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0C0A09] text-white">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex min-h-[136px] max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/profissional")}
            className="flex shrink-0 items-center"
            aria-label="Voltar para minha área profissional"
          >
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              className="h-auto w-[190px] object-contain"
              priority
              unoptimized
            />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-orange-400">
                Área do profissional
              </p>
              <p className="text-lg font-bold text-white sm:text-2xl">
                Olá, {name}!
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 text-sm text-zinc-400 transition hover:text-orange-400"
              >
                Sair
              </button>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950">
              {avatarUrl && !avatarFailed ? (
                <Image
                  src={avatarUrl}
                  alt={`Foto de ${name}`}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-xl font-bold text-orange-400">
                  {name.charAt(0).toUpperCase() || "P"}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <button
          type="button"
          onClick={() => router.push("/profissional")}
          className="mb-6 text-sm font-semibold text-orange-400 transition hover:text-orange-300"
        >
          ← Voltar para minha área
        </button>

        <div className="inline-flex rounded-full border border-orange-600/40 bg-orange-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-orange-400">
          OPORTUNIDADES
        </div>

        <h1 className="mt-5 text-3xl font-bold">
          Serviços disponíveis
        </h1>

        <p className="mt-2 text-zinc-400">
          Aqui aparecem as solicitações compatíveis com seus serviços e região.
        </p>

        {message && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
          >
            {message}
          </div>
        )}

        {opportunities.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-8 text-center">
            <p className="text-lg font-semibold">
              Nenhuma oportunidade no momento
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Quando surgir uma solicitação compatível, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.match_id}
                className="rounded-2xl border border-zinc-800 bg-black p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                        {opportunity.service_code}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                        Nova oportunidade
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-semibold">
                      {opportunity.service_name}
                    </h2>

                    <p className="mt-3 text-zinc-300">
                      {opportunity.description}
                    </p>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-zinc-500">Local</p>
                        <p className="mt-1 text-zinc-200">
                          {opportunity.neighborhood || "Bairro não informado"}
                          {" — "}
                          {opportunity.city}/{opportunity.state}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Valor do serviço</p>
                        <p className="mt-1 font-semibold text-orange-400">
                          {formatPrice(opportunity.price)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Urgência</p>
                        <p className="mt-1 text-zinc-200">
                          {opportunity.urgency === "urgent"
                            ? "Urgente"
                            : "Normal"}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Recebida em</p>
                        <p className="mt-1 text-zinc-200">
                          {formatDate(opportunity.sent_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/profissional/oportunidades/${encodeURIComponent(
                            opportunity.match_id,
                          )}`,
                        )
                      }
                      className="w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 md:w-auto"
                    >
                      Ver oportunidade
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
