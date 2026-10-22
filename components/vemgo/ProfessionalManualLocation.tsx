"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Point = { lat: number; lng: number };
type ReverseResult = {
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    residential?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    house_number?: string;
  };
};

const LeafletMap = dynamic(() => import("./ProfessionalManualLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-xl border border-white/10 bg-black text-sm text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

function buildStreetAddress(result: ReverseResult) {
  const a = result.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.residential;
  const locality = a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb;
  const parts = [street, a.neighbourhood ?? a.suburb, locality, a.state, a.postcode]
    .filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);
  return {
    street: street ?? "",
    locality: parts.join(", "),
    houseNumber: a.house_number ?? "",
    displayName: result.display_name ?? "",
  };
}

export default function ProfessionalManualLocation() {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const mapCenter = useMemo<[number, number]>(
    () => point ? [point.lat, point.lng] : [-22.3145, -49.0587],
    [point]
  );

  async function reverseGeocode(nextPoint: Point) {
    setGeocoding(true);
    setMessage("");
    setStreetAddress("");
    setHouseNumber("");
    setAddressDetails("");

    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(nextPoint.lat),
        lon: String(nextPoint.lng),
        addressdetails: "1",
        "accept-language": "pt-BR",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error("O serviço de endereços não respondeu.");

      const result = (await response.json()) as ReverseResult;
      const parsed = buildStreetAddress(result);
      setStreetAddress(parsed.street || parsed.displayName);
      setHouseNumber(parsed.houseNumber);
      setAddressDetails(parsed.locality);
      setMessage(
        parsed.street
          ? "Endereço sugerido pelo mapa. Confira e corrija antes de salvar."
          : "Não foi possível identificar a rua com segurança. Informe o endereço manualmente."
      );
    } catch {
      setMessage("Não foi possível consultar o endereço automaticamente. Preencha a rua e o número manualmente.");
    } finally {
      setGeocoding(false);
    }
  }

  function pickPoint(nextPoint: Point) {
    setPoint(nextPoint);
    void reverseGeocode(nextPoint);
  }

  async function saveLocation() {
    if (!point) {
      setMessage("Clique no mapa para escolher um ponto primeiro.");
      return;
    }
    if (!streetAddress.trim()) {
      setMessage("Informe a rua ou o endereço antes de salvar.");
      return;
    }
    if (streetAddress.trim().length > 300 || houseNumber.trim().length > 30) {
      setMessage("Confira o tamanho dos campos de endereço.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error("Entre novamente na sua conta.");

      const fullAddress = [
        streetAddress.trim(),
        houseNumber.trim() ? `nº ${houseNumber.trim()}` : "",
        addressDetails.trim(),
      ].filter(Boolean).join(", ");

      const { error } = await supabase.rpc("set_professional_manual_location", {
        p_latitude: point.lat,
        p_longitude: point.lng,
        p_address: fullAddress,
        p_house_number: houseNumber.trim() || null,
      });
      if (error) throw new Error(error.message);

      setMessage("Localização manual salva. Ela não comprova presença física nem substitui GPS verificado.");
    } catch (error) {
      setMessage(error instanceof Error ? `Não foi possível salvar: ${error.message}` : "Não foi possível salvar o ponto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-orange-500/25 bg-[#11100e] p-5 text-white sm:p-6">
      <h2 className="font-semibold">Definir localização no mapa</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Clique no mapa para sugerir um endereço e informe o número da rua.
        A localização será identificada como manual, não como GPS verificado.
      </p>
      <button type="button" onClick={() => setOpen((value) => !value)}
        className="mt-4 rounded-xl border border-orange-500/40 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10">
        {open ? "Fechar mapa" : "Escolher no mapa"}
      </button>

      {open && (
        <div className="mt-4">
          <LeafletMap center={mapCenter} point={point} onPick={pickPoint} />
          <p className="mt-3 text-sm text-zinc-300">
            {point ? `Latitude: ${point.lat.toFixed(6)} | Longitude: ${point.lng.toFixed(6)}` : "Clique no mapa para marcar a posição desejada."}
          </p>
          {geocoding && <p className="mt-2 text-sm text-orange-300">Identificando endereço...</p>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Rua / endereço
              <input value={streetAddress} onChange={(event) => setStreetAddress(event.target.value)} maxLength={300}
                placeholder="Ex.: Avenida Exemplo"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2.5 text-white outline-none focus:border-orange-500" />
            </label>
            <label className="block text-sm text-zinc-300">
              Número
              <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} maxLength={30}
                placeholder="Ex.: 123 ou s/n"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2.5 text-white outline-none focus:border-orange-500" />
            </label>
            <label className="block text-sm text-zinc-300">
              Bairro / cidade / CEP
              <input value={addressDetails} onChange={(event) => setAddressDetails(event.target.value)} maxLength={300}
                placeholder="Preenchido pelo mapa, se disponível"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2.5 text-white outline-none focus:border-orange-500" />
            </label>
          </div>

          <button type="button" disabled={!point || saving || geocoding} onClick={() => void saveLocation()}
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Salvando..." : "Confirmar endereço e ponto"}
          </button>
          {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-orange-300">{message}</p>}
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            O endereço automático usa dados do OpenStreetMap/Nominatim e pode não conter número de imóvel. Confira os campos antes de salvar.
          </p>
        </div>
      )}
    </section>
  );
}
