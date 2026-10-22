"use client";

import { useEffect, useState } from "react";

type Props = {
  onStatusChange?: (status: "idle" | "tracking" | "error") => void;
};

export default function ProfessionalLiveLocation({ onStatusChange }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = setTimeout(() => {
        setError("Geolocalização não disponível neste dispositivo");
        onStatusChange?.("error");
      }, 0);
      return () => clearTimeout(timer);
    }

    onStatusChange?.("idle");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        onStatusChange?.("tracking");
      },
      (err) => {
        console.warn("[VemGO] GPS error:", err.message);
        setError(err.message);
        onStatusChange?.("error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      onStatusChange?.("idle");
    };
  }, [onStatusChange]);

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-700/50 bg-amber-950/20 p-5">
        <p className="text-sm font-semibold text-amber-300">GPS indisponível</p>
        <p className="mt-1 text-xs text-zinc-400">{error} — usando localização cadastrada</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Localização ao vivo</p>
      <h3 className="mt-2 text-sm font-semibold text-white">
        {coords ? "GPS ativo e rastreando" : "Buscando localização..."}
      </h3>
      {coords && (
        <p className="mt-2 text-xs text-zinc-400">
          Lat: {coords.lat.toFixed(6)} · Lng: {coords.lng.toFixed(6)}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        Sua localização é usada apenas para encontrar chamados próximos. Não é exibida para clientes.
      </p>
    </div>
  );
}