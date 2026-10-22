
"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  getNextProfessionalOnboardingStep,
  getProfessionalOnboardingRoute,
  PROFESSIONAL_ONBOARDING_STEPS,
} from "@/lib/professional-onboarding";

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

const labelClassName =
  "mb-2 block text-sm font-medium text-zinc-200";

type ViaCepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export default function CadastroProfissionalEnderecoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState("");
  const [label, setLabel] = useState("Principal");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(true);
  const [searchingCep, setSearchingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAddress() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/login?role=professional");
        return;
      }

      setUserId(user.id);

      const { data: address, error: addressError } = await supabase
        .from("addresses")
        .select(
          "id, label, recipient_name, postal_code, street, number, complement, neighborhood, city, state, country, latitude, longitude",
        )
        .eq("profile_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (addressError) {
        setError(
          `Não foi possível carregar seu endereço: ${addressError.message}`,
        );
        setLoading(false);
        return;
      }

      if (address) {
        setLatitude(typeof address.latitude === "number" ? address.latitude : null);
        setLongitude(typeof address.longitude === "number" ? address.longitude : null);
        setLabel(address.label || "Principal");

        const digits = (address.postal_code || "").replace(/\D/g, "");
        setPostalCode(
          digits.length > 5
            ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
            : digits,
        );

        setStreet(address.street || "");
        setNumber(address.number || "");
        setComplement(address.complement || "");
        setNeighborhood(address.neighborhood || "");
        setCity(address.city || "");
        setState(address.state || "");
      }

      setLoading(false);
    }

    void loadAddress();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  function handleUseCurrentLocation() {
    setError("");
    setLocationMessage("");

    if (!("geolocation" in navigator)) {
      setLocationMessage("Este navegador não oferece geolocalização. Você pode continuar preenchendo o endereço manualmente.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;

        if (
          !Number.isFinite(nextLatitude) ||
          !Number.isFinite(nextLongitude) ||
          nextLatitude < -90 ||
          nextLatitude > 90 ||
          nextLongitude < -180 ||
          nextLongitude > 180
        ) {
          setLocationMessage("Não foi possível validar as coordenadas recebidas. Você pode continuar manualmente.");
          setLocating(false);
          return;
        }

        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setLocationMessage("GPS obtido. Buscando o endereço aproximado...");

        try {
          const params = new URLSearchParams({
            format: "jsonv2",
            lat: String(nextLatitude),
            lon: String(nextLongitude),
            addressdetails: "1",
            "accept-language": "pt-BR",
            zoom: "18",
          });
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
            headers: { Accept: "application/json" },
          });
          if (!response.ok) throw new Error("reverse_geocoding_failed");
          const result = await response.json();
          const address = result?.address ?? {};
          const road =
            address.road ??
            address.pedestrian ??
            address.residential ??
            address.footway ??
            address.path ??
            address.cycleway ??
            address.highway ??
            "";
          const responseNeighborhood =
            address.suburb ??
            address.neighbourhood ??
            address.quarter ??
            address.city_district ??
            address.hamlet ??
            address.residential ??
            "";
          const responseCity =
            address.city ??
            address.town ??
            address.village ??
            address.municipality ??
            address.county ??
            "";
          const stateCode =
            address["ISO3166-2-lvl4"]?.split("-").pop() ??
            address["ISO3166-2-lvl3"]?.split("-").pop() ??
            "";
          const postalCode = address.postcode ?? "";
          const houseNumber = address.house_number ?? "";
          let cepAddress: {
            logradouro?: string;
            bairro?: string;
            localidade?: string;
            uf?: string;
            erro?: boolean;
          } | null = null;
          const postalDigits = postalCode.replace(/\D/g, "");

          // O GPS não dispara o onChange/onBlur do CEP. Consulte o ViaCEP
          // diretamente para completar o endereço sem exigir cliques adicionais.
          if (postalDigits.length === 8) {
            try {
              const cepResponse = await fetch(
                `https://viacep.com.br/ws/${postalDigits}/json/`,
              );
              if (cepResponse.ok) {
                const cepData = await cepResponse.json();
                if (!cepData.erro) cepAddress = cepData;
              }
            } catch {
              // Mantém os dados do GPS mesmo se o ViaCEP estiver indisponível.
            }
          }

          const resolvedStreet = road || cepAddress?.logradouro || "";
          const resolvedNeighborhood =
            responseNeighborhood || cepAddress?.bairro || "";
          const resolvedCity = responseCity || cepAddress?.localidade || "";
          const resolvedState =
            stateCode.length === 2
              ? stateCode
              : (address.state ?? "").toLowerCase().includes("são paulo")
                ? "SP"
                : cepAddress?.uf || "";

          if (resolvedStreet) setStreet(resolvedStreet);
          if (houseNumber) setNumber(houseNumber);
          if (resolvedNeighborhood) setNeighborhood(resolvedNeighborhood);
          if (resolvedCity) setCity(resolvedCity);
          if (resolvedState) setState(resolvedState.toUpperCase());
          if (postalCode && (road || responseCity || responseNeighborhood || cepAddress)) {
            setPostalCode(
              postalDigits.length > 5
                ? `${postalDigits.slice(0, 5)}-${postalDigits.slice(5)}`
                : postalDigits,
            );
          }

          const effectiveRoad = resolvedStreet || street.trim();
          const effectiveCity = resolvedCity || city.trim();
          const effectiveNeighborhood =
            resolvedNeighborhood || neighborhood.trim();

          setLocationMessage(
            effectiveRoad
              ? "GPS localizado! Rua e endereço aproximado preenchidos. Confira todos os campos, principalmente número e CEP, antes de salvar."
              : effectiveCity || effectiveNeighborhood
                ? "GPS localizado! Bairro e cidade foram identificados, mas a rua não foi retornada. Preencha ou confirme a rua manualmente antes de salvar."
                : "GPS localizado, mas não foi possível identificar o endereço completo. Confira e preencha os campos manualmente.",
          );
        } catch {
          setLocationMessage("Coordenadas GPS obtidas, mas não foi possível consultar o endereço automaticamente. Você pode preencher os campos manualmente.");
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "Permissão de localização negada. Você pode continuar preenchendo o endereço manualmente."
            : geoError.code === geoError.TIMEOUT
              ? "A localização demorou demais. Tente novamente ou preencha manualmente."
              : "Não foi possível obter a localização. Confira a permissão do navegador ou preencha manualmente.";
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function handlePostalCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);

    const formatted =
      digits.length > 5
        ? `${digits.slice(0, 5)}-${digits.slice(5)}`
        : digits;

    setPostalCode(formatted);
    setMessage("");
    setError("");

    if (digits.length !== 8) return;

    setSearchingCep(true);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${digits}/json/`,
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError("CEP não encontrado. Confira o número informado.");
        return;
      }

      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState((data.uf || "").toUpperCase());
      setMessage("Endereço localizado pelo CEP. Confira os dados.");
    } catch {
      setError(
        "Não foi possível consultar o CEP. Preencha o endereço manualmente.",
      );
    } finally {
      setSearchingCep(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedLabel = label.trim() || "Principal";
    const normalizedPostalCode = postalCode.replace(/\D/g, "");
    const normalizedStreet = street.trim();
    const normalizedNumber = number.trim();
    const normalizedComplement = complement.trim();
    const normalizedNeighborhood = neighborhood.trim();
    const normalizedCity = city.trim();
    const normalizedState = state.trim().toUpperCase();

    if (!userId) {
      setError("Usuário não identificado. Entre novamente na sua conta.");
      return;
    }

    if (normalizedPostalCode.length !== 8) {
      setError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (!normalizedStreet) {
      setError("Informe a rua ou avenida.");
      return;
    }

    if (!normalizedNumber) {
      setError("Informe o número do endereço.");
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

    if (normalizedState.length !== 2) {
      setError("Informe a UF com duas letras.");
      return;
    }

    setSaving(true);

    try {
      const { data: existingAddress, error: existingError } =
        await supabase
          .from("addresses")
          .select("id")
          .eq("profile_id", userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (existingError) {
        setError(
          `Não foi possível verificar seu endereço: ${existingError.message}`,
        );
        return;
      }

      const addressPayload = {
        profile_id: userId,
        label: normalizedLabel,
        recipient_name: "",
        postal_code: normalizedPostalCode,
        street: normalizedStreet,
        number: normalizedNumber,
        complement: normalizedComplement || null,
        neighborhood: normalizedNeighborhood,
        city: normalizedCity,
        state: normalizedState,
        country: "BR",
        is_default: true,
        latitude,
        longitude,
      };

      if (existingAddress?.id) {
        const { error: updateError } = await supabase
          .from("addresses")
          .update(addressPayload)
          .eq("id", existingAddress.id)
          .eq("profile_id", userId);

        if (updateError) {
          setError(
            `Não foi possível salvar seu endereço: ${updateError.message}`,
          );
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("addresses")
          .insert(addressPayload);

        if (insertError) {
          setError(
            `Não foi possível salvar seu endereço: ${insertError.message}`,
          );
          return;
        }
      }

      const nextStep = getNextProfessionalOnboardingStep(
        PROFESSIONAL_ONBOARDING_STEPS.ADDRESS,
      );

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          professional_onboarding_step: nextStep,
        })
        .eq("id", userId)
        .eq("user_type", "professional");

      if (profileError) {
        setError(
          `Endereço salvo, mas não foi possível atualizar o progresso: ${profileError.message}`,
        );
        return;
      }

      setMessage("Endereço salvo com sucesso.");

      window.setTimeout(() => {
        router.replace(getProfessionalOnboardingRoute(nextStep));
      }, 700);
    } catch {
      setError(
        "Ocorreu um erro inesperado ao salvar o endereço. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-md flex-col justify-center">
        <header className="mb-8">
          <div className="text-center">
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              className="mx-auto h-auto w-[190px] object-contain"
              priority
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-orange-400">
              Etapa 2 de 9
            </p>
          </div>

          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-label="Progresso do cadastro profissional"
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={2}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 min-w-0 flex-1 rounded-full ${
                  index < 2 ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </header>

        <section className="mb-6">

          <h1 className="text-3xl font-bold tracking-tight text-white">
            Seu endereço
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Informe seu endereço principal. Usaremos essas informações
            para configurar sua área de atendimento.
          </p>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Carregando seu endereço...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm sm:p-6"
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="label" className={labelClassName}>
                  Identificação do endereço
                </label>
                <input
                  id="label"
                  name="label"
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Principal"
                  className={inputClassName}
                />
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">Localização GPS (opcional)</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Autorize o navegador para registrar as coordenadas do local. Use somente se estiver no endereço profissional informado; o preenchimento manual continua disponível.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating || saving}
                    className="shrink-0 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locating ? "Obtendo GPS..." : latitude !== null && longitude !== null ? "Atualizar GPS" : "Usar minha localização"}
                  </button>
                </div>
                {locationMessage && (
                  <p role="status" className="mt-3 text-xs leading-5 text-zinc-400">{locationMessage}</p>
                )}
                {latitude !== null && longitude !== null && (
                  <p className="mt-2 text-xs text-emerald-400">Coordenadas registradas para este endereço.</p>
                )}
              </div>

              <div>
                <label htmlFor="postalCode" className={labelClassName}>
                  CEP
                </label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={postalCode}
                  onChange={(event) =>
                    void handlePostalCodeChange(event.target.value)
                  }
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputClassName}
                  required
                />
                {searchingCep && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Consultando CEP...
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="street" className={labelClassName}>
                  Rua / Avenida
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  autoComplete="address-line1"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  placeholder="Nome da rua ou avenida"
                  className={inputClassName}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="number" className={labelClassName}>
                    Número
                  </label>
                  <input
                    id="number"
                    name="number"
                    type="text"
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                    placeholder="Nº"
                    className={inputClassName}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="complement" className={labelClassName}>
                    Complemento
                  </label>
                  <input
                    id="complement"
                    name="complement"
                    type="text"
                    autoComplete="address-line2"
                    value={complement}
                    onChange={(event) =>
                      setComplement(event.target.value)
                    }
                    placeholder="Opcional"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="neighborhood" className={labelClassName}>
                  Bairro
                </label>
                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  autoComplete="address-level3"
                  value={neighborhood}
                  onChange={(event) =>
                    setNeighborhood(event.target.value)
                  }
                  placeholder="Nome do bairro"
                  className={inputClassName}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label htmlFor="city" className={labelClassName}>
                    Cidade
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Sua cidade"
                    className={inputClassName}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="state" className={labelClassName}>
                    UF
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    autoComplete="address-level1"
                    value={state}
                    onChange={(event) =>
                      setState(
                        event.target.value.toUpperCase().slice(0, 2),
                      )
                    }
                    placeholder="SP"
                    maxLength={2}
                    className={inputClassName}
                    required
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-400"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || searchingCep || locating}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando endereço..." : "Salvar e continuar"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Seus dados de endereço são utilizados para configurar
          seu cadastro profissional na VemGO.
        </p>
      </div>
    </main>
  );
}
