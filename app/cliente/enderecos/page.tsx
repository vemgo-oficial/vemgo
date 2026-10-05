"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  country: string;
  is_default: boolean;
};

export default function EnderecosPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAddresses() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("addresses")
        .select(
          "id, label, recipient_name, postal_code, street, number, complement, neighborhood, city, state, country, is_default"
        )
        .eq("profile_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (!active) {
        return;
      }

      if (error) {
        setMessage("Não foi possível carregar seus endereços.");
        setLoading(false);
        return;
      }

      setAddresses(data || []);
      setLoading(false);
    }

    void Promise.resolve().then(loadAddresses);

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSetDefault(addressId: string) {
    setMessage("");
    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: resetError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("profile_id", user.id)
      .eq("is_default", true);

    if (resetError) {
      setMessage("Não foi possível alterar o endereço principal.");
      setSaving(false);
      return;
    }

    const { error: defaultError } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("profile_id", user.id);

    if (defaultError) {
      setMessage("Não foi possível definir o endereço principal.");
      setSaving(false);
      return;
    }

    setAddresses((current) =>
      current.map((address) => ({
        ...address,
        is_default: address.id === addressId,
      }))
    );

    setMessage("Endereço principal atualizado.");
    setSaving(false);
  }

  async function handleDelete(addressId: string) {
    setMessage("");

    const address = addresses.find((item) => item.id === addressId);

    if (!address) {
      return;
    }

    if (address.is_default) {
      setMessage(
        "Defina outro endereço como principal antes de excluir este."
      );
      return;
    }

    const confirmed = window.confirm(
      "Deseja realmente excluir este endereço?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("profile_id", user.id);

    if (error) {
      setMessage("Não foi possível excluir o endereço.");
      setSaving(false);
      return;
    }

    setAddresses((current) =>
      current.filter((item) => item.id !== addressId)
    );

    setMessage("Endereço excluído.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Carregando endereços...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => router.push("/cliente")}
            className="flex items-center"
          >
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={150}
              height={55}
              priority
              className="h-auto w-[150px] object-contain"
            />
          </button>

          <button
            type="button"
            onClick={() => router.push("/cliente")}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Voltar
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">
              Meus endereços
            </h2>

            <p className="mt-2 text-zinc-600">
              Cadastre e gerencie os locais onde você solicita serviços.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/cliente/enderecos/novo")}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            + Novo endereço
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">
              Nenhum endereço cadastrado
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Cadastre seu primeiro endereço para solicitar serviços pela
              VemGO.
            </p>

            <button
              type="button"
              onClick={() => router.push("/cliente/enderecos/novo")}
              className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              Cadastrar endereço
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {address.label}
                      </h3>

                      {address.is_default && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Principal
                        </span>
                      )}
                    </div>

                    {address.recipient_name && (
                      <p className="mt-2 text-sm text-zinc-600">
                        {address.recipient_name}
                      </p>
                    )}

                    <p className="mt-2 text-zinc-800">
                      {address.street}, {address.number}
                      {address.complement
                        ? ` — ${address.complement}`
                        : ""}
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      {address.neighborhood} — {address.city}/
                      {address.state}
                    </p>

                    {address.postal_code && (
                      <p className="mt-1 text-sm text-zinc-500">
                        CEP: {address.postal_code}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!address.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={saving}
                        className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Tornar principal
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      disabled={saving}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Excluir
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