"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export default function ProfissionalServicosPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] =
    useState<Set<string>>(new Set());

  const [name, setName] = useState("Profissional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_type, status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (profile.user_type === "client") {
        router.replace("/cliente");
        return;
      }

      if (profile.user_type === "admin") {
        router.replace("/controle");
        return;
      }

      if (profile.user_type === "company") {
        router.replace("/empresa");
        return;
      }

      if (profile.user_type !== "professional") {
        router.replace("/login");
        return;
      }

      setName(profile.full_name || "Profissional");

      const {
        data: servicesData,
        error: servicesError,
      } = await supabase
        .from("services")
        .select(
          "id, code, name, description, is_active"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("code", { ascending: true });

      if (servicesError) {
        setError(
          `Não foi possível carregar os serviços: ${servicesError.message}`
        );
        setLoading(false);
        return;
      }

      const {
        data: selectedData,
        error: selectedError,
      } = await supabase
        .from("professional_services")
        .select("service_id")
        .eq("professional_id", user.id)
        .eq("is_active", true);

      if (selectedError) {
        setError(
          `Não foi possível carregar suas competências: ${selectedError.message}`
        );
        setLoading(false);
        return;
      }

      setServices(servicesData || []);

      setSelectedServices(
        new Set(
          (selectedData || []).map(
            (item) => item.service_id
          )
        )
      );

      setLoading(false);
    }

    void loadServices();
  }, [router, supabase]);

  function toggleService(serviceId: string) {
    setMessage("");
    setError("");

    setSelectedServices((current) => {
      const next = new Set(current);

      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }

      return next;
    });
  }

  async function handleSave() {
    setMessage("");
    setError("");

    if (selectedServices.size === 0) {
      setError(
        "Selecione pelo menos um serviço que você está habilitado a executar."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type, status")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.user_type !== "professional" ||
      profile.status === "blocked"
    ) {
      router.replace(
        profile?.user_type === "client"
          ? "/cliente"
          : profile?.user_type === "admin"
          ? "/controle"
          : profile?.user_type === "company"
          ? "/empresa"
          : "/login"
      );
      return;
    }

    const selectedIds = Array.from(selectedServices);

    const { error: deactivateError } =
      await supabase
        .from("professional_services")
        .update({ is_active: false })
        .eq("professional_id", user.id);

    if (deactivateError) {
      setError(
        `Não foi possível atualizar seus serviços: ${deactivateError.message}`
      );
      setSaving(false);
      return;
    }

    const rows = selectedIds.map((serviceId) => ({
      professional_id: user.id,
      service_id: serviceId,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from("professional_services")
      .upsert(rows, {
        onConflict: "professional_id,service_id",
      });

    if (insertError) {
      setError(
        `Não foi possível salvar suas competências: ${insertError.message}`
      );
      setSaving(false);
      return;
    }

    setMessage(
      `${selectedServices.size} serviço(s) selecionado(s) com sucesso.`
    );

    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          Carregando serviços...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <header className="border-b border-stone-800 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={360}
              height={200}
              className="h-auto w-[190px] object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-stone-500">
                Serviços e competências
              </p>

              <p className="text-sm text-stone-300">
                Olá,{" "}
                <span className="font-semibold text-white">
                  {name}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-300 transition hover:border-orange-500 hover:text-orange-400"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/profissional")}
          className="text-sm font-semibold text-orange-500 hover:text-orange-400"
        >
          ← Voltar para minha área
        </button>

        <div className="mt-6">
          <div className="mb-5 inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
            SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
          </div>

          <h1 className="text-3xl font-bold">
            Serviços e competências
          </h1>

          <p className="mt-2 max-w-3xl text-stone-400">
            Selecione os serviços que você está habilitado e preparado
            para executar pela VemGO.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-orange-900 bg-orange-950/30 px-4 py-3 text-sm text-orange-300">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-stone-800 bg-black p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Elétrica
              </h2>

              <p className="text-sm text-stone-500">
                Catálogo VemGO
              </p>
            </div>

            <div className="rounded-full bg-stone-900 px-4 py-2 text-sm text-stone-300">
              {selectedServices.size} selecionado(s)
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {services.map((service) => {
              const selected =
                selectedServices.has(service.id);

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    toggleService(service.id)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-orange-500 bg-orange-950/30"
                      : "border-stone-800 bg-stone-950 hover:border-stone-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                        selected
                          ? "border-orange-500 bg-orange-500 text-black"
                          : "border-stone-600"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-orange-400">
                          {service.code}
                        </span>

                        <span className="font-semibold text-white">
                          {service.name}
                        </span>
                      </div>

                      {service.description && (
                        <p className="mt-1 text-sm text-stone-500">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              A seleção poderá ser alterada posteriormente.
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : "Salvar competências"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}