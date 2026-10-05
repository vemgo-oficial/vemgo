"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Address = {
  id: string;
  label: string;
  recipient_name: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
};


export default function ClientePage() {
  const router = useRouter();

  const [name, setName] = useState("Cliente");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadClient() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, user_type, status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        profileError ||
        !profile ||
        profile.user_type !== "client" ||
        profile.status === "blocked"
      ) {
        router.replace("/login");
        return;
      }

      setName(profile.full_name || "Cliente");

      const { data: addressData, error: addressError } =
        await supabase
          .from("addresses")
          .select(
            "id, label, recipient_name, street, number, complement, neighborhood, city, state, is_default"
          )
          .eq("profile_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (addressError) {
        setError("Não foi possível carregar seus endereços.");
      } else {
        const loadedAddresses = addressData || [];

        setAddresses(loadedAddresses);

        const defaultAddress =
          loadedAddresses.find((address) => address.is_default) ||
          loadedAddresses[0];

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      }

      setLoading(false);
    }

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function classifyService(text: string) {
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    /*
     * Regras iniciais do MVP.
     *
     * A IA entrará futuramente para interpretar necessidades
     * que não possam ser resolvidas por regras.
     */

    if (
      normalized.includes("tomada") &&
      (normalized.includes("energia") ||
        normalized.includes("sem energia") ||
        normalized.includes("nao funciona") ||
        normalized.includes("não funciona"))
    ) {
      return "ELE-098";
    }

    if (
      normalized.includes("lampada") ||
      normalized.includes("luz") ||
      normalized.includes("lâmpada") ||
      normalized.includes("iluminacao") ||
      normalized.includes("iluminação")
    ) {
      return "ELE-001";
    }

    return null;
  }

  async function handleRequest() {
    setMessage("");
    setError("");

    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setError("Descreva o que você precisa.");
      return;
    }

    if (!selectedAddressId) {
      setError(
        "Selecione um endereço ou cadastre um novo endereço."
      );
      return;
    }

    setSending(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const serviceCode = classifyService(trimmedDescription);

      if (!serviceCode) {
        setError(
          "Ainda não conseguimos identificar automaticamente este serviço. No MVP atual, experimente descrever uma necessidade de forma mais específica."
        );
        return;
      }

      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, code, name")
        .eq("code", serviceCode)
        .eq("is_active", true)
        .maybeSingle();

      if (serviceError || !service) {
        setError(
          "O serviço identificado ainda não está disponível no catálogo."
        );
        return;
      }

      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          client_id: user.id,
          service_id: service.id,
          address_id: selectedAddressId,
          description: trimmedDescription,
          urgency,
          status: "pending",
        })
        .select("id")
        .single();

      if (requestError || !request) {
        setError(
          requestError?.message ||
            "Não foi possível criar sua solicitação."
        );
        return;
      }

      setDescription("");
      setMessage(
        `Solicitação criada para o serviço "${service.name}".`
      );

      /*
       * O backend/motor de matching continuará responsável
       * por encontrar profissionais compatíveis.
       */

      setTimeout(() => {
        router.push("/cliente/servicos");
      }, 800);
    } catch {
      setError("Ocorreu um erro ao criar sua solicitação.");
    } finally {
      setSending(false);
    }
  }

  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">
          Carregando sua área...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/cliente")}
            className="flex items-center"
          >
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={190}
              height={64}
              priority
              unoptimized
            />
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-zinc-500">
                Área do cliente
              </p>

              <p className="text-sm text-zinc-300">
                Olá,{" "}
                <span className="font-semibold text-white">
                  {name}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-green-500 hover:text-green-400"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* IDENTIDADE */}
        <div className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-green-400">
          SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
        </div>

        <div className="mt-5">
          <h1 className="text-4xl font-bold tracking-tight">
            O que você precisa resolver hoje?
          </h1>

          <p className="mt-2 text-zinc-400">
            Conte sua necessidade e a VemGO encontrará o serviço
            adequado.
          </p>
        </div>

        {/* ATALHOS */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => router.push("/cliente/servicos")}
            className="group rounded-2xl border border-green-500/30 bg-green-500/5 p-6 text-left transition hover:border-green-500 hover:bg-green-500/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-xl text-green-400">
                ✓
              </div>

              <span className="text-green-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Meus serviços
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Acompanhe pedidos, agendamentos e histórico.
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/cliente/enderecos")}
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left transition hover:border-green-500/60"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl text-green-400">
                ⌂
              </div>

              <span className="text-green-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Meus endereços
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Gerencie os locais onde você solicita serviços.
            </p>
          </button>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl text-green-400">
              ?
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Precisa de ajuda?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Em breve você poderá acessar o suporte diretamente
              pela plataforma.
            </p>
          </div>
        </div>

        {/* NOVA SOLICITAÇÃO */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
                Nova solicitação
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Conte o que está acontecendo
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Descreva sua necessidade com suas próprias palavras.
              </p>
            </div>

            <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400">
              VemGO
            </div>
          </div>

          <div className="mt-7">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Descreva o que você precisa
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Ex.: minha tomada está sem energia no quarto"
              rows={5}
              className="w-full resize-none rounded-2xl border border-zinc-700 bg-black px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          {/* ENDEREÇO */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
                  Local do serviço
                </p>

                {selectedAddress ? (
                  <>
                    <h3 className="mt-3 text-lg font-semibold">
                      {selectedAddress.label}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-300">
                      {selectedAddress.street},{" "}
                      {selectedAddress.number}
                      {selectedAddress.complement
                        ? ` — ${selectedAddress.complement}`
                        : ""}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedAddress.neighborhood} —{" "}
                      {selectedAddress.city}/
                      {selectedAddress.state}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-3 text-lg font-semibold">
                      Nenhum endereço cadastrado
                    </h3>

                    <p className="mt-2 text-sm text-zinc-500">
                      Cadastre um endereço para solicitar serviços.
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push("/cliente/enderecos")}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-green-400 transition hover:border-green-500"
              >
                Gerenciar
              </button>
            </div>

            {addresses.length > 1 && (
              <div className="mt-5 border-t border-zinc-800 pt-5">
                <label className="mb-2 block text-sm text-zinc-400">
                  Usar outro endereço
                </label>

                <select
                  value={selectedAddressId}
                  onChange={(event) =>
                    setSelectedAddressId(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-green-500"
                >
                  {addresses.map((address) => (
                    <option
                      key={address.id}
                      value={address.id}
                    >
                      {address.label} — {address.street},{" "}
                      {address.number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* URGÊNCIA */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-zinc-300">
              Prioridade
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setUrgency("normal")}
                className={`rounded-xl border p-4 text-left transition ${
                  urgency === "normal"
                    ? "border-green-500 bg-green-500/10"
                    : "border-zinc-700 bg-black hover:border-zinc-600"
                }`}
              >
                <p
                  className={`font-semibold ${
                    urgency === "normal"
                      ? "text-green-400"
                      : "text-white"
                  }`}
                >
                  Normal
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Quero resolver normalmente.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUrgency("urgent")}
                className={`rounded-xl border p-4 text-left transition ${
                  urgency === "urgent"
                    ? "border-green-500 bg-green-500/10"
                    : "border-zinc-700 bg-black hover:border-zinc-600"
                }`}
              >
                <p
                  className={`font-semibold ${
                    urgency === "urgent"
                      ? "text-green-400"
                      : "text-white"
                  }`}
                >
                  Urgente
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Preciso resolver o quanto antes.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleRequest}
            disabled={sending || !selectedAddressId}
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-4 text-base font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending
              ? "Criando solicitação..."
              : "Solicitar serviço →"}
          </button>
        </div>
      </section>
    </main>
  );
}