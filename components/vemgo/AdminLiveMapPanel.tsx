"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type LiveLocation = {
  professional_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
  updated_at: string;
};

type Professional = {
  id: string;
  display_name: string | null;
  verification_status: string | null;
  service_status: string | null;
  is_accepting_calls: boolean | null;
};

type Appointment = {
  id: string;
  order_id: string;
  professional_id: string;
  starts_at: string | null;
  status: string;
};

type Pin = {
  location: LiveLocation;
  professional: Professional;
  appointment: Appointment | null;
  activeCallConflict: boolean;
};

const STALE_AFTER_MS = 2 * 60 * 1000;

function fmtDate(value: string | null | undefined) {
  if (!value) return "Não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function isFresh(value: string) {
  const timestamp = new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now() &&
    Date.now() - timestamp <= STALE_AFTER_MS
  );
}

function validCoordinates(location: LiveLocation) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function AdminLiveMapPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type,status")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (
        !profile ||
        profile.user_type !== "admin" ||
        profile.status !== "active"
      ) {
        router.replace(
          profile?.user_type === "client"
            ? "/cliente"
            : profile?.user_type === "professional"
              ? "/profissional"
              : "/login",
        );
        return;
      }

      const [locRes, profRes, appRes] = await Promise.all([
        supabase
          .from("professional_live_locations")
          .select(
            "professional_id,latitude,longitude,accuracy_m,captured_at,updated_at",
          )
          .order("captured_at", { ascending: false }),

        supabase
          .from("professionals")
          .select(
            "id,display_name,verification_status,service_status,is_accepting_calls",
          ),

        supabase
          .from("appointments")
          .select("id,order_id,professional_id,starts_at,status")
          .in("status", ["confirmed", "in_progress", "scheduled"])
          .order("starts_at", { ascending: true }),
      ]);

      if (locRes.error) throw locRes.error;
      if (profRes.error) throw profRes.error;
      if (appRes.error) throw appRes.error;

      const professionals = (profRes.data || []) as Professional[];
      const locations = (locRes.data || []) as LiveLocation[];
      const appointments = (appRes.data || []) as Appointment[];

      const professionalMap = new Map(
        professionals.map((professional) => [
          professional.id,
          professional,
        ]),
      );

      const latestLocation = new Map<string, LiveLocation>();

      for (const location of locations) {
        if (!latestLocation.has(location.professional_id)) {
          latestLocation.set(location.professional_id, location);
        }
      }

      const nextPins: Pin[] = [];

      for (const location of latestLocation.values()) {
        if (!validCoordinates(location)) continue;

        const professional = professionalMap.get(
          location.professional_id,
        );

        if (!professional) continue;

        const activeAppointments = appointments.filter(
          (appointment) =>
            appointment.professional_id === professional.id &&
            appointment.status === "in_progress",
        );

        const scheduledAppointments = appointments.filter(
          (appointment) =>
            appointment.professional_id === professional.id &&
            ["confirmed", "scheduled"].includes(appointment.status),
        );

        const activeCallConflict = activeAppointments.length > 1;

        const selectedAppointment =
          activeAppointments.length === 1
            ? activeAppointments[0]
            : activeAppointments.length > 1
              ? null
              : scheduledAppointments.length === 1
                ? scheduledAppointments[0]
                : null;

        nextPins.push({
          location,
          professional,
          appointment: selectedAppointment,
          activeCallConflict,
        });
      }

      setPins(nextPins);

      setSelectedId((current) => {
        if (current && nextPins.some((pin) => pin.professional.id === current)) {
          return current;
        }

        return nextPins[0]?.professional.id ?? null;
      });

      setUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      const message =
        typeof loadError === "object" &&
        loadError !== null &&
        "message" in loadError &&
        typeof loadError.message === "string"
          ? loadError.message
          : "Não foi possível carregar o mapa.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    let cancelled = false;

    const runLoad = async () => {
      if (cancelled) return;
      await load();
    };

    void runLoad();

    const timer = window.setInterval(() => {
      void runLoad();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [load]);

  const selected =
    pins.find((pin) => pin.professional.id === selectedId) ?? null;

  const freshPins = pins.filter((pin) =>
    isFresh(pin.location.captured_at),
  );

  const mapUrl = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.location.longitude - 0.01}%2C${selected.location.latitude - 0.01}%2C${selected.location.longitude + 0.01}%2C${selected.location.latitude + 0.01}&layer=mapnik&marker=${selected.location.latitude}%2C${selected.location.longitude}`
    : null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-700 bg-[#080d16] p-4 text-white md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Operação
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Mapa de profissionais
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Selecione um profissional para consultar a posição registrada e
            o chamado associado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-400">
            Localizações recentes
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {freshPins.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-400">
            Localizações encontradas
          </p>
          <p className="mt-1 text-2xl font-bold">{pins.length}</p>
        </div>

        <div className="col-span-2 rounded-xl bg-slate-900 p-3 md:col-span-1">
          <p className="text-xs text-slate-400">Última consulta</p>
          <p className="mt-1 text-sm">{fmtDate(updatedAt)}</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200"
        >
          Falha ao carregar os dados: {error}. Confirme a autorização
          administrativa e a política RLS de leitura das localizações.
        </div>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-slate-400">
          Carregando localizações...
        </p>
      )}

      {!loading && !error && pins.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          Nenhuma localização recebida ainda. O profissional precisa estar
          com o compartilhamento de localização ativo.
        </p>
      )}

      {!loading && !error && pins.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            {mapUrl && (
              <iframe
                title="Mapa da localização selecionada"
                src={mapUrl}
                className="h-[360px] w-full border-0 md:h-[480px]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}

            <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-400">
              Mapa © OpenStreetMap. O marcador representa a última posição
              registrada do profissional selecionado.
            </p>

            <div className="max-h-60 divide-y divide-slate-800 overflow-auto">
              {pins.map((pin) => {
                const { location, professional, appointment } = pin;
                const fresh = isFresh(location.captured_at);
                const active = selectedId === professional.id;

                return (
                  <button
                    key={professional.id}
                    type="button"
                    onClick={() => setSelectedId(professional.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                      active
                        ? "bg-blue-950/70"
                        : "hover:bg-slate-800/70"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        !fresh
                          ? "bg-slate-500"
                          : appointment?.status === "in_progress"
                            ? "bg-emerald-400"
                            : "bg-orange-400"
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {professional.display_name || "Profissional sem nome"}
                      </span>

                      <span className="block text-xs text-slate-400">
                        {pin.activeCallConflict
                          ? "Chamados simultâneos — revisar"
                          : appointment?.status === "in_progress"
                            ? "Em chamado"
                            : "Sem chamado em execução"}
                        {" · "}
                        {fresh
                          ? "Localização recente"
                          : "Localização desatualizada"}
                      </span>
                    </span>

                    <span className="text-xs text-slate-500">Ver</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <aside className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-300">
                    Ficha do profissional
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    {selected.professional.display_name || "Nome não informado"}
                  </h3>

                  <p className="mt-1 break-all text-sm text-slate-400">
                    ID: {selected.professional.id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    isFresh(selected.location.captured_at)
                      ? "bg-emerald-950 text-emerald-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {isFresh(selected.location.captured_at)
                    ? "Recente"
                    : "Desatualizado"}
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Situação do cadastro</dt>
                  <dd className="mt-1">
                    {selected.professional.verification_status || "Não informado"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Situação de serviço</dt>
                  <dd className="mt-1">
                    {selected.professional.service_status || "Não informado"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Aceita chamados</dt>
                  <dd className="mt-1">
                    {selected.professional.is_accepting_calls ? "Sim" : "Não"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Coordenadas</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {Number(selected.location.latitude).toFixed(6)},{" "}
                    {Number(selected.location.longitude).toFixed(6)}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Precisão GPS</dt>
                  <dd className="mt-1">
                    {selected.location.accuracy_m == null
                      ? "Não informada"
                      : `${Math.round(selected.location.accuracy_m)} m`}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Última posição recebida</dt>
                  <dd className="mt-1">
                    {fmtDate(selected.location.captured_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl border border-slate-700 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Chamado / agendamento
                </p>

                {selected.activeCallConflict ? (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200"
                  >
                    Foram encontrados vários chamados em execução para este
                    profissional. Confira os registros no painel administrativo;
                    nenhum chamado foi escolhido automaticamente.
                  </div>
                ) : selected.appointment ? (
                  <>
                    <p className="mt-2 font-semibold">
                      {selected.appointment.status === "in_progress"
                        ? "Em execução"
                        : selected.appointment.status === "confirmed"
                          ? "Confirmado"
                          : "Agendado"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Início: {fmtDate(selected.appointment.starts_at)}
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      Pedido: {selected.appointment.order_id}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/controle/agendamentos/${encodeURIComponent(
                            selected.appointment!.order_id,
                          )}`,
                        )
                      }
                      className="mt-3 w-full rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-950"
                    >
                      Abrir detalhes do chamado
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Nenhum chamado único confirmado ou em execução foi
                    localizado para este profissional.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/controle/profissionais?professionalId=${encodeURIComponent(
                      selected.professional.id,
                    )}`,
                  )
                }
                className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Abrir perfil administrativo
              </button>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}