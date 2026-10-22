
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { PageState } from "@/components/ui/PageState";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Address = {
  id: string;
  label: string;
  recipient_name: string | null;
  postal_code: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
};

export default function ClienteEnderecosPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login?redirect=/cliente/enderecos");
      return;
    }

    const { data, error: addressesError } = await supabase
      .from("addresses")
      .select(
        "id, label, recipient_name, postal_code, street, number, complement, neighborhood, city, state, is_default",
      )
      .eq("profile_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (addressesError) {
      setError("Não foi possível carregar seus endereços.");
      setLoading(false);
      return;
    }

    setAddresses(data ?? []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadAddresses);
  }, [loadAddresses]);

  async function handleSetDefault(addressId: string) {
    setError("");
    setUpdating(addressId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login?redirect=/cliente/enderecos");
      return;
    }

    // Marque o destino antes de limpar os demais: se a primeira escrita falhar,
    // o endereço principal atual continua intacto.
    const { data: selectedAddress, error: updateError } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("profile_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError || !selectedAddress) {
      setError("Não foi possível definir o endereço principal.");
      setUpdating(null);
      return;
    }

    const { error: clearError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("profile_id", user.id)
      .neq("id", addressId);

    if (clearError) {
      await loadAddresses();
      setError(
        "O endereço escolhido foi definido como principal, mas não foi possível atualizar os demais. Confira a lista e tente novamente.",
      );
      setUpdating(null);
      return;
    }

    await loadAddresses();
    setUpdating(null);
  }

  async function handleDelete(address: Address) {
    if (address.is_default && addresses.length > 1) {
      setError(
        "Defina outro endereço como principal antes de excluir este.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir o endereço "${address.label}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(address.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login?redirect=/cliente/enderecos");
      return;
    }

    const { error: deleteError } = await supabase
      .from("addresses")
      .delete()
      .eq("id", address.id)
      .eq("profile_id", user.id);

    if (deleteError) {
      setError("Não foi possível excluir este endereço.");
      setDeleting(null);
      return;
    }

    await loadAddresses();
    setDeleting(null);
  }

  function formatAddress(address: Address) {
    const firstLine = `${address.street}, ${address.number}`;

    const secondLine = [
      address.complement,
      address.neighborhood,
    ]
      .filter(Boolean)
      .join(" · ");

    const thirdLine = `${address.city} - ${address.state}`;

    return {
      firstLine,
      secondLine,
      thirdLine,
    };
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 pt-6">
        <button
          type="button"
          onClick={() => router.push("/cliente")}
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-green-400 transition hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        >
          <span aria-hidden="true">←</span>
          <span>Voltar para minha área</span>
        </button>
      </div>

      <section className="mx-auto max-w-4xl px-6 py-8 sm:py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-green-400">
  Cliente
</span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Meus endereços
            </h1>

            <p className="mt-2 text-zinc-500">
              Gerencie os locais onde você costuma solicitar
              atendimentos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/cliente/enderecos/novo")}
            className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-black transition hover:bg-green-400"
          >
            + Novo endereço
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        {loading ? (
          <PageState kind="loading" tone="client" title="Carregando endereços..." />
        ) : addresses.length === 0 ? (
          <PageState
            kind="empty"
            tone="client"
            title="Nenhum endereço cadastrado"
            description="Cadastre seu primeiro endereço para poder solicitar serviços na VemGO."
            action={{ label: "Cadastrar endereço", href: "/cliente/enderecos/novo" }}
          />
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => {
              const formatted = formatAddress(address);

              return (
                <Card
                  key={address.id}
                  padding="lg"
                  className={
                    address.is_default
                      ? "border-green-500/30"
                      : ""
                  }
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-xl text-green-400">
                        📍
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-white">
                            {address.label}
                          </h2>

                          {address.is_default && (
                            <span className="inline-flex rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                              Principal
                            </span>
                          )}
                        </div>

                        {address.recipient_name && (
                          <p className="mt-2 text-sm text-zinc-400">
                            {address.recipient_name}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-zinc-300">
                          {formatted.firstLine}
                        </p>

                        {formatted.secondLine && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {formatted.secondLine}
                          </p>
                        )}

                        <p className="mt-1 text-sm text-zinc-500">
                          {formatted.thirdLine}
                        </p>

                        {address.postal_code && (
                          <p className="mt-2 text-xs text-zinc-700">
                            CEP {address.postal_code}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      {!address.is_default && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={updating === address.id}
                          onClick={() =>
                            handleSetDefault(address.id)
                          }
                        >
                          {updating === address.id
                            ? "Atualizando..."
                            : "Definir principal"}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/cliente/enderecos/novo?id=${address.id}`,
                          )
                        }
                      >
                        Editar
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        disabled={deleting === address.id}
                        onClick={() => handleDelete(address)}
                      >
                        {deleting === address.id
                          ? "Excluindo..."
                          : "Excluir"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
