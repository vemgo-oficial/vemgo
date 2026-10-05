"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function NovoEnderecoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [label, setLabel] = useState("Principal");
  const [recipientName, setRecipientName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [message, setMessage] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  function handlePostalCodeChange(value: string) {
    const cep = value.replace(/\D/g, "").slice(0, 8);

    if (cep.length > 5) {
      setPostalCode(`${cep.slice(0, 5)}-${cep.slice(5)}`);
    } else {
      setPostalCode(cep);
    }
  }

  async function handleCepBlur() {
    const cep = postalCode.replace(/\D/g, "");

    if (cep.length !== 8) {
      return;
    }

    setMessage("");
    setLoadingCep(true);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

      if (!response.ok) {
        setMessage("Não foi possível consultar o CEP.");
        return;
      }

      const data = await response.json();

      if (data.erro) {
        setMessage("CEP não encontrado.");
        return;
      }

      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch {
      setMessage("Não foi possível consultar o CEP.");
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSave() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (
      !street.trim() ||
      !number.trim() ||
      !neighborhood.trim() ||
      !city.trim() ||
      !state.trim()
    ) {
      setMessage("Preencha os campos obrigatórios.");
      return;
    }

    const { count, error: countError } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id);

    if (countError) {
      setMessage(`Erro: ${countError.message}`);
      return;
    }

    const isFirstAddress = (count ?? 0) === 0;

    const { error } = await supabase.from("addresses").insert({
      profile_id: user.id,
      label: label.trim() || "Principal",
      recipient_name: recipientName.trim() || null,
      postal_code: postalCode.trim() || null,
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      country: "BR",
      is_default: isFirstAddress,
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
      return;
    }

    router.push("/cliente/enderecos");
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-black">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => router.push("/cliente/enderecos")}
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
            onClick={() => router.push("/cliente/enderecos")}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Voltar
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">
            Cadastrar endereço
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Informe o local onde o serviço será realizado.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Nome do endereço
              </label>

              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ex.: Casa"
                className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Nome de quem recebe
              </label>

              <input
                type="text"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Nome completo"
                className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  CEP
                </label>

                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) =>
                    handlePostalCodeChange(event.target.value)
                  }
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

                {loadingCep && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Consultando CEP...
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Rua
                </label>

                <input
                  type="text"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  placeholder="Nome da rua"
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Número
                </label>

                <input
                  type="text"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="123"
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Complemento
                </label>

                <input
                  type="text"
                  value={complement}
                  onChange={(event) => setComplement(event.target.value)}
                  placeholder="Apartamento, bloco, etc."
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Bairro
              </label>

              <input
                type="text"
                value={neighborhood}
                onChange={(event) => setNeighborhood(event.target.value)}
                placeholder="Nome do bairro"
                className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Cidade
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Cidade"
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Estado
                </label>

                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  placeholder="SP"
                  className="h-12 w-full rounded-xl border border-zinc-300 px-4 uppercase outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="h-12 w-full rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
            >
              Salvar endereço
            </button>

            {message && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {message}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}