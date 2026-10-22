"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AddressForm = {
  label: string;
  recipient_name: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const initialForm: AddressForm = {
  label: "",
  recipient_name: "",
  postal_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

function NovoEnderecoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const addressId = searchParams.get("id");
  const isEditing = Boolean(addressId);

  const [form, setForm] = useState<AddressForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [error, setError] = useState("");
  const [cepMessage, setCepMessage] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    async function loadAddress() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?redirect=/cliente/enderecos/novo");
        return;
      }

      if (!addressId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        setForm((current) => ({
          ...current,
          recipient_name: profile?.full_name ?? "",
        }));

        setLoading(false);
        return;
      }

      const { data, error: addressError } = await supabase
        .from("addresses")
        .select(
          "id, label, recipient_name, postal_code, street, number, complement, neighborhood, city, state, latitude, longitude",
        )
        .eq("id", addressId)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (addressError || !data) {
        setError("Não foi possível encontrar este endereço.");
        setLoading(false);
        return;
      }

      setLatitude(typeof data.latitude === "number" ? data.latitude : null);
      setLongitude(typeof data.longitude === "number" ? data.longitude : null);

      setForm({
        label: data.label ?? "",
        recipient_name: data.recipient_name ?? "",
        postal_code: data.postal_code ?? "",
        street: data.street ?? "",
        number: data.number ?? "",
        complement: data.complement ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      });

      setLoading(false);
    }

    void loadAddress();
  }, [addressId, router, supabase]);

  function updateField(field: keyof AddressForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

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
          const neighborhood =
            address.suburb ??
            address.neighbourhood ??
            address.quarter ??
            address.city_district ??
            address.hamlet ??
            address.residential ??
            "";
          const city =
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
          const stateName = address.state ?? "";
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

          // O GPS não dispara o onBlur do campo CEP. Consulte o ViaCEP
          // diretamente para completar logradouro/bairro/cidade sem exigir cliques.
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
            neighborhood || cepAddress?.bairro || "";
          const resolvedCity = city || cepAddress?.localidade || "";
          const resolvedState =
            stateCode.length === 2
              ? stateCode
              : stateName.toLowerCase().includes("são paulo")
                ? "SP"
                : cepAddress?.uf || "";

          setForm((current) => ({
            ...current,
            street: resolvedStreet || current.street,
            number: houseNumber || current.number,
            neighborhood: resolvedNeighborhood || current.neighborhood,
            city: resolvedCity || current.city,
            state: resolvedState || current.state,
            postal_code:
              postalCode && (road || city || neighborhood || cepAddress)
                ? formatCep(postalCode)
                : current.postal_code,
          }));

          const effectiveRoad = resolvedStreet || form.street.trim();
          const effectiveCity = resolvedCity || form.city.trim();
          const effectiveNeighborhood =
            resolvedNeighborhood || form.neighborhood.trim();

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

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);

    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }

    return digits;
  }

  async function handleCepBlur() {
    const cep = form.postal_code.replace(/\D/g, "");

    if (cep.length !== 8) {
      return;
    }

    setSearchingCep(true);
    setCepMessage("");
    setError("");

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`,
      );

      if (!response.ok) {
        throw new Error("Falha ao consultar CEP.");
      }

      const data = await response.json();

      if (data.erro) {
        setCepMessage("CEP não encontrado.");
        setSearchingCep(false);
        return;
      }

      setForm((current) => ({
        ...current,
        street: data.logradouro ?? current.street,
        neighborhood: data.bairro ?? current.neighborhood,
        city: data.localidade ?? current.city,
        state: data.uf ?? current.state,
      }));

      setCepMessage("Endereço localizado automaticamente.");
    } catch {
      setCepMessage(
        "Não foi possível consultar o CEP. Preencha o endereço manualmente.",
      );
    } finally {
      setSearchingCep(false);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const {
      label,
      recipient_name,
      postal_code,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    } = form;

    if (!label.trim()) {
      setError("Informe um nome para este endereço.");
      return;
    }

    if (!recipient_name.trim()) {
      setError("Informe o nome de quem receberá o atendimento.");
      return;
    }

    if (postal_code.replace(/\D/g, "").length !== 8) {
      setError("Informe um CEP válido.");
      return;
    }

    if (!street.trim()) {
      setError("Informe a rua.");
      return;
    }

    if (!number.trim()) {
      setError("Informe o número.");
      return;
    }

    if (!neighborhood.trim()) {
      setError("Informe o bairro.");
      return;
    }

    if (!city.trim()) {
      setError("Informe a cidade.");
      return;
    }

    if (!state.trim()) {
      setError("Informe o estado.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login?redirect=/cliente/enderecos/novo");
      return;
    }

    const addressData = {
      profile_id: user.id,
      label: label.trim(),
      recipient_name: recipient_name.trim(),
      postal_code: postal_code.replace(/\D/g, ""),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      country: "BR",
      latitude,
      longitude,
    };

    if (isEditing && addressId) {
      const { error: updateError } = await supabase
        .from("addresses")
        .update(addressData)
        .eq("id", addressId)
        .eq("profile_id", user.id);

      if (updateError) {
        setError("Não foi possível atualizar o endereço.");
        setSaving(false);
        return;
      }
    } else {
      const { data: existingDefault } = await supabase
        .from("addresses")
        .select("id")
        .eq("profile_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      const { error: insertError } = await supabase
        .from("addresses")
        .insert({
          ...addressData,
          is_default: !existingDefault,
        });

      if (insertError) {
        setError("Não foi possível cadastrar o endereço.");
        setSaving(false);
        return;
      }
    }

    router.push("/cliente/enderecos");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <Spinner
            size="lg"
            variant="client"
            label="Carregando endereço..."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:py-10">
        <Link
          href="/cliente/enderecos"
          className="mb-6 inline-flex rounded-lg text-sm font-semibold text-zinc-400 transition hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          ← Voltar para meus endereços
        </Link>
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-400">
            Meus endereços
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {isEditing ? "Editar endereço" : "Novo endereço"}
          </h1>

          <p className="mt-2 text-zinc-500">
            Informe o local onde o atendimento será realizado.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                id="label"
                label="Nome do endereço"
                placeholder="Ex.: Casa, Trabalho"
                value={form.label}
                onChange={(event) =>
                  updateField("label", event.target.value)
                }
                required
              />

              <Input
                id="recipient_name"
                label="Nome do responsável"
                placeholder="Quem receberá o profissional"
                value={form.recipient_name}
                onChange={(event) =>
                  updateField(
                    "recipient_name",
                    event.target.value,
                  )
                }
                required
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Localização GPS (opcional)</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Autorize o navegador para registrar as coordenadas do local. Use somente se estiver no endereço informado; o preenchimento manual continua disponível.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={handleUseCurrentLocation} disabled={locating || saving}>
                  {locating ? "Obtendo GPS..." : latitude !== null && longitude !== null ? "Atualizar GPS" : "Usar minha localização"}
                </Button>
              </div>
              {locationMessage && (
                <p role="status" className="mt-3 text-xs leading-5 text-zinc-400">{locationMessage}</p>
              )}
              {latitude !== null && longitude !== null && (
                <p className="mt-2 text-xs text-emerald-400">Coordenadas registradas para este endereço.</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <Input
                id="postal_code"
                label="CEP"
                placeholder="00000-000"
                value={form.postal_code}
                onChange={(event) =>
                  updateField(
                    "postal_code",
                    formatCep(event.target.value),
                  )
                }
                onBlur={handleCepBlur}
                inputMode="numeric"
                maxLength={9}
                required
              />

              <div className="flex items-end">
                {searchingCep ? (
                  <Spinner
                    size="sm"
                    variant="client"
                    label="Consultando CEP..."
                  />
                ) : cepMessage ? (
                  <p className="pb-3 text-xs text-zinc-500">
                    {cepMessage}
                  </p>
                ) : (
                  <p className="pb-3 text-xs text-zinc-600">
                    Digite o CEP para preencher o endereço
                    automaticamente.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
              <Input
                id="street"
                label="Rua / Logradouro"
                placeholder="Nome da rua"
                value={form.street}
                onChange={(event) =>
                  updateField("street", event.target.value)
                }
                required
              />

              <Input
                id="number"
                label="Número"
                placeholder="123"
                value={form.number}
                onChange={(event) =>
                  updateField("number", event.target.value)
                }
                required
              />
            </div>

            <Input
              id="complement"
              label="Complemento"
              placeholder="Apartamento, bloco, casa dos fundos..."
              value={form.complement}
              onChange={(event) =>
                updateField("complement", event.target.value)
              }
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                id="neighborhood"
                label="Bairro"
                placeholder="Bairro"
                value={form.neighborhood}
                onChange={(event) =>
                  updateField(
                    "neighborhood",
                    event.target.value,
                  )
                }
                required
              />

              <Input
                id="city"
                label="Cidade"
                placeholder="Cidade"
                value={form.city}
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                id="state"
                label="Estado"
                placeholder="SP"
                value={form.state}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value.toUpperCase(),
                  )
                }
                maxLength={2}
                required
              />

              <div className="flex items-end">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
                  País:{" "}
                  <span className="text-zinc-300">
                    Brasil
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push("/cliente/enderecos")
                }
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving || locating}>
                {saving
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alterações"
                    : "Cadastrar endereço"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

function NovoEnderecoFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <Spinner
        size="lg"
        variant="client"
        label="Carregando endereço..."
      />
    </main>
  );
}

export default function NovoEnderecoPage() {
  return (
    <Suspense fallback={<NovoEnderecoFallback />}>
      <NovoEnderecoPageContent />
    </Suspense>
  );
}
