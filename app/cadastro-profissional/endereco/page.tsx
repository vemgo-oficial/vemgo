"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export default function CadastroProfissionalEnderecoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country] = useState("Brasil");
  const [serviceRadius, setServiceRadius] = useState("50");

  const [loadingCep, setLoadingCep] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  async function searchCep(value: string) {
    const cleanCep = value.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      return;
    }

    setLoadingCep(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError("CEP não encontrado.");
        return;
      }

      setStreet(data.logradouro ?? "");
      setNeighborhood(data.bairro ?? "");
      setCity(data.localidade ?? "");
      setState(data.uf ?? "");

      if (data.complemento) {
        setComplement(data.complemento);
      }

      setMessage("Endereço localizado automaticamente pelo CEP.");
    } catch {
      setError(
        "Não foi possível consultar o CEP. Confira o número ou preencha o endereço manualmente.",
      );
    } finally {
      setLoadingCep(false);
    }
  }

  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length === 8) {
      const timeout = setTimeout(() => {
        searchCep(cep);
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [cep]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanCep = cep.replace(/\D/g, "");
    const normalizedStreet = street.trim();
    const normalizedNumber = number.trim();
    const normalizedNeighborhood = neighborhood.trim();
    const normalizedCity = city.trim();
    const normalizedState = state.trim().toUpperCase();

    if (cleanCep.length !== 8) {
      setError("Informe um CEP válido.");
      return;
    }

    if (!normalizedStreet) {
      setError("Informe o logradouro.");
      return;
    }

    if (!normalizedNumber) {
      setError("Informe o número.");
      return;
    }

    if (!normalizedNeighborhood) {
      setError("Informe o bairro.");
      return;
    }

    if (!normalizedCity) {
      setError("Informe a cidade.");
      return;
    }

    if (!normalizedState) {
      setError("Informe o estado.");
      return;
    }

    const radius = Number(serviceRadius);

    if (!Number.isFinite(radius) || radius <= 0) {
      setError("Informe uma área de atendimento válida.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Sua sessão não foi encontrada. Faça login novamente.",
        );
        return;
      }

      /*
       * Verifica se já existe um endereço padrão.
       * Se existir, atualizamos.
       * Se não existir, criamos.
       */
      const { data: existingAddress, error: existingError } =
        await supabase
          .from("addresses")
          .select("id")
          .eq("profile_id", user.id)
          .eq("is_default", true)
          .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      const addressData = {
        profile_id: user.id,
        label: "Endereço profissional",
        postal_code: cleanCep,
        street: normalizedStreet,
        number: normalizedNumber,
        complement: complement.trim() || null,
        neighborhood: normalizedNeighborhood,
        city: normalizedCity,
        state: normalizedState,
        country,
        is_default: true,
      };

      let addressError = null;

      if (existingAddress) {
        const result = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", existingAddress.id);

        addressError = result.error;
      } else {
        const result = await supabase
          .from("addresses")
          .insert(addressData);

        addressError = result.error;
      }

      if (addressError) {
        throw new Error(addressError.message);
      }

      /*
       * A área de atendimento será utilizada na etapa
       * de regiões do profissional.
       *
       * Neste momento salvamos o endereço corretamente
       * e seguimos para a próxima etapa.
       */
      console.log("Área de atendimento informada:", radius);

      router.push("/cadastro-profissional/foto");
    } catch (saveError) {
      const errorMessage =
        saveError instanceof Error
          ? saveError.message
          : "Erro desconhecido.";

      setError(
        `Não foi possível salvar o endereço: ${errorMessage}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-400">
            Etapa 2 de 9
          </div>

          <h1 className="text-3xl font-bold">
            Seu endereço
          </h1>

          <p className="mt-3 text-zinc-400">
            Informe onde você atende e qual região deseja
            atender pela VemGO.
          </p>
        </div>

        <div className="mb-7 grid grid-cols-7 gap-1">
          <div className="h-1.5 rounded-full bg-orange-500" />
          <div className="h-1.5 rounded-full bg-orange-500" />
          <div className="h-1.5 rounded-full bg-zinc-800" />
          <div className="h-1.5 rounded-full bg-zinc-800" />
          <div className="h-1.5 rounded-full bg-zinc-800" />
          <div className="h-1.5 rounded-full bg-zinc-800" />
          <div className="h-1.5 rounded-full bg-zinc-800" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <label
              htmlFor="cep"
              className="text-sm font-medium text-zinc-200"
            >
              CEP
            </label>

            <input
              id="cep"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={cep}
              onChange={(event) => {
                setCep(formatCep(event.target.value));
                setError("");
                setMessage("");
              }}
              onBlur={() => searchCep(cep)}
              placeholder="00000-000"
              maxLength={9}
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
            />

            {loadingCep && (
              <p className="mt-2 text-xs text-orange-400">
                Consultando CEP...
              </p>
            )}
          </div>

          <div className="mt-5">
            <label
              htmlFor="street"
              className="text-sm font-medium text-zinc-200"
            >
              Rua
            </label>

            <input
              id="street"
              type="text"
              autoComplete="street-address"
              value={street}
              onChange={(event) =>
                setStreet(event.target.value)
              }
              placeholder="Nome da rua"
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="number"
                className="text-sm font-medium text-zinc-200"
              >
                Número
              </label>

              <input
                id="number"
                type="text"
                autoComplete="address-line2"
                value={number}
                onChange={(event) =>
                  setNumber(event.target.value)
                }
                placeholder="123"
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="complement"
                className="text-sm font-medium text-zinc-200"
              >
                Complemento
              </label>

              <input
                id="complement"
                type="text"
                value={complement}
                onChange={(event) =>
                  setComplement(event.target.value)
                }
                placeholder="Opcional"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="neighborhood"
              className="text-sm font-medium text-zinc-200"
            >
              Bairro
            </label>

            <input
              id="neighborhood"
              type="text"
              autoComplete="address-level3"
              value={neighborhood}
              onChange={(event) =>
                setNeighborhood(event.target.value)
              }
              placeholder="Seu bairro"
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="city"
              className="text-sm font-medium text-zinc-200"
            >
              Cidade
            </label>

            <input
              id="city"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              placeholder="Sua cidade"
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="state"
                className="text-sm font-medium text-zinc-200"
              >
                Estado
              </label>

              <input
                id="state"
                type="text"
                autoComplete="address-level1"
                value={state}
                onChange={(event) =>
                  setState(
                    event.target.value
                      .toUpperCase()
                      .slice(0, 2),
                  )
                }
                placeholder="SP"
                maxLength={2}
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="text-sm font-medium text-zinc-200"
              >
                País
              </label>

              <input
                id="country"
                type="text"
                value={country}
                disabled
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-300 outline-none"
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="serviceRadius"
              className="text-sm font-medium text-zinc-200"
            >
              Área de atendimento
            </label>

            <div className="mt-2 flex items-center gap-3">
              <input
                id="serviceRadius"
                type="number"
                min="1"
                max="300"
                value={serviceRadius}
                onChange={(event) =>
                  setServiceRadius(event.target.value)
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />

              <span className="text-sm text-zinc-400">
                km
              </span>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Informe aproximadamente até onde você deseja
              atender.
            </p>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingCep}
            className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Salvando..."
              : "Continuar →"}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
            Você poderá revisar essas informações antes da
            validação final do cadastro.
          </p>
        </form>
      </div>
    </main>
  );
}