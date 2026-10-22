
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type LocationStatus = "idle" | "tracking" | "error";

export default function ProfessionalLiveLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [message, setMessage] = useState(
    "Sua localização só será compartilhada quando você ativar."
  );
  const watchId = useRef<number | null>(null);
  const sending = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    return () => {
      active.current = false;

      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    if (!active.current || sending.current) return;

    sending.current = true;

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.rpc(
        "set_professional_live_location",
        {
          p_latitude: position.coords.latitude,
          p_longitude: position.coords.longitude,
          p_accuracy_m: position.coords.accuracy,
        }
      );

      if (error) throw error;

      if (active.current) {
        setStatus("tracking");
        setMessage("GPS ativo. Sua posição está sendo atualizada.");
      }
    } catch {
      if (active.current) {
        setStatus("error");
        setMessage(
          "Não foi possível enviar sua localização. Confira sua sessão e tente novamente."
        );
      }
    } finally {
      sending.current = false;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Este navegador não oferece suporte à geolocalização.");
      return;
    }

    active.current = true;
    setStatus("idle");
    setMessage("Aguardando permissão e sinal do GPS...");

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        void sendPosition(position);
      },
      (error) => {
        active.current = false;

        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }

        setStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Permissão de localização negada. Autorize o GPS no navegador."
            : "Não foi possível obter a localização. Verifique o GPS e tente novamente."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, [sendPosition]);

  const stopTracking = useCallback(() => {
    active.current = false;

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setStatus("idle");
    setMessage("GPS desativado nesta página.");
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111512] p-5 text-white">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <span aria-hidden="true">◎</span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Localização em tempo real</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Permita que a VemGO use sua posição atual para identificar
            oportunidades próximas. Seu endereço residencial não é usado
            como GPS atual.
          </p>

          <p
            role="status"
            className={`mt-3 text-sm ${
              status === "error"
                ? "text-red-400"
                : status === "tracking"
                  ? "text-emerald-400"
                  : "text-zinc-300"
            }`}
          >
            {message}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {status !== "tracking" ? (
              <button
                type="button"
                onClick={startTracking}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Ativar GPS
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTracking}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
              >
                Desativar GPS
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
