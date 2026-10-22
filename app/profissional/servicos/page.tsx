"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Service = {

  id: string;

  category_id: string | null;

  code: string;

  name: string;

  description: string | null;

  is_active: boolean;

};

type Category = {

  id: string;

  name: string;

  slug: string;

};

export default function ProfissionalServicosPage() {

  const router = useRouter();

  const supabase = createSupabaseBrowserClient();

  const [services, setServices] = useState<Service[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  const [name, setName] = useState("Profissional");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {

    let cancelled = false;

    async function loadServices() {

      const {

        data: { user },

      } = await supabase.auth.getUser();

      if (!user) {

        router.replace("/login");

        return;

      }

      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("full_name, avatar_url, user_type, status, professional_onboarding_step")

        .eq("id", user.id)

        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profile) {

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

      if (profile.user_type !== "professional") {

        router.replace("/login");

        return;

      }

      const firstName =

        profile.full_name?.trim().split(/\s+/)[0] || "Profissional";

      setName(firstName);

      // Igual à página principal: avatar_url pode ser uma URL pública

      // ou o caminho de um arquivo no bucket privado profile-photos.

      setAvatarUrl("");

      const storedAvatar =

        typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";

      if (storedAvatar) {

        if (/^https?:\/\//i.test(storedAvatar)) {

          setAvatarUrl(storedAvatar);

        } else {

          const { data: signedImage, error: imageError } = await supabase.storage

            .from("profile-photos")

            .createSignedUrl(storedAvatar, 3600);

          if (!cancelled && !imageError && signedImage?.signedUrl) {

            setAvatarUrl(signedImage.signedUrl);

          }

        }

      }

      if (cancelled) return;

      if (

        profile.professional_onboarding_step !== null &&

        profile.professional_onboarding_step < 10

      ) {

        router.replace("/cadastro-profissional/competencias");

        return;

      }

      const { data: servicesData, error: servicesError } = await supabase

        .from("services")

        .select("id, category_id, code, name, description, is_active")

        .eq("is_active", true)

        .order("display_order", { ascending: true })

        .order("code", { ascending: true });

      if (cancelled) return;

      if (servicesError) {

        setError(`Não foi possível carregar os serviços: ${servicesError.message}`);

        setLoading(false);

        return;

      }

      const { data: categoriesData, error: categoriesError } = await supabase

        .from("categories")

        .select("id, name, slug")

        .eq("is_active", true)

        .order("display_order", { ascending: true })

        .order("name", { ascending: true });

      if (cancelled) return;

      if (categoriesError) {

        setError(`Não foi possível carregar as categorias: ${categoriesError.message}`);

        setLoading(false);

        return;

      }

      const { data: selectedData, error: selectedError } = await supabase

        .from("professional_services")

        .select("service_id")

        .eq("professional_id", user.id)

        .eq("is_active", true);

      if (cancelled) return;

      if (selectedError) {

        setError(`Não foi possível carregar suas competências: ${selectedError.message}`);

        setLoading(false);

        return;

      }

      setServices(servicesData || []);

      setCategories(categoriesData || []);

      setSelectedServices(new Set((selectedData || []).map((item) => item.service_id)));

      setLoading(false);

    }

    void loadServices();

    return () => {

      cancelled = true;

    };

  }, [router, supabase]);

  function toggleService(serviceId: string) {

    setMessage("");

    setError("");

    setSelectedServices((current) => {

      const next = new Set(current);

      if (next.has(serviceId)) next.delete(serviceId);

      else next.add(serviceId);

      return next;

    });

  }

  async function handleSave() {

    setMessage("");

    setError("");

    if (selectedServices.size === 0) {

      setError("Selecione pelo menos um serviço que você está habilitado a executar.");

      return;

    }

    setSaving(true);

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      router.replace("/login");

      setSaving(false);

      return;

    }

    const { data: profile } = await supabase

      .from("profiles")

      .select("user_type, status")

      .eq("id", user.id)

      .maybeSingle();

    if (!profile || profile.user_type !== "professional" || profile.status === "blocked") {

      if (profile?.user_type === "client") router.replace("/cliente");

      else if (profile?.user_type === "admin") router.replace("/controle");

      else router.replace("/login");

      setSaving(false);

      return;

    }

    const selectedIds = Array.from(selectedServices);

    const { error: deactivateError } = await supabase

      .from("professional_services")

      .update({ is_active: false })

      .eq("professional_id", user.id);

    if (deactivateError) {

      setError(`Não foi possível atualizar seus serviços: ${deactivateError.message}`);

      setSaving(false);

      return;

    }

    const rows = selectedIds.map((serviceId) => ({

      professional_id: user.id,

      service_id: serviceId,

      is_active: true,

    }));

    const { error: upsertError } = await supabase

      .from("professional_services")

      .upsert(rows, { onConflict: "professional_id,service_id" });

    if (upsertError) {

      setError(`Não foi possível salvar suas competências: ${upsertError.message}`);

      setSaving(false);

      return;

    }

    setMessage(`${selectedServices.size} serviço(s) selecionado(s) com sucesso.`);

    setSaving(false);

  }

  async function handleLogout() {

    await supabase.auth.signOut();

    router.replace("/login");

  }

  const filteredServices = useMemo(() => {

    const normalizedSearch = search.trim().toLowerCase();

    return services.filter((service) => {

      const matchesSearch =

        !normalizedSearch ||

        service.name.toLowerCase().includes(normalizedSearch) ||

        service.code.toLowerCase().includes(normalizedSearch);

      const matchesCategory = categoryFilter === "all" || service.category_id === categoryFilter;

      return matchesSearch && matchesCategory;

    });

  }, [services, search, categoryFilter]);

  const groupedServices = useMemo(() => {

    const groups = new Map<string, { category: Category | null; services: Service[] }>();

    for (const service of filteredServices) {

      const category = categories.find((item) => item.id === service.category_id) || null;

      const key = service.category_id || "sem-categoria";

      const current = groups.get(key);

      if (current) current.services.push(service);

      else groups.set(key, { category, services: [service] });

    }

    return Array.from(groups.values());

  }, [filteredServices, categories]);

  if (loading) {

    return (

      <main className="min-h-screen bg-[#0C0A09] px-6 py-12 text-white">

        <div className="mx-auto max-w-6xl">

          <p className="text-sm text-zinc-400">Carregando serviços...</p>

        </div>

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-[#0C0A09] text-white">

      <header className="border-b border-zinc-800 bg-black">

        <div className="mx-auto flex min-h-[132px] max-w-6xl items-center justify-between gap-6 px-6 py-5">

          <button

            type="button"

            onClick={() => router.push("/profissional")}

            className="flex shrink-0 items-center"

            aria-label="Voltar para minha área profissional"

          >

            <Image

              src="/logo-vemgo-transparente.png"

              alt="VemGO"

              width={1751}

              height={465}

              className="h-auto w-[190px] object-contain"

              priority

              unoptimized

            />

          </button>

          <div className="flex items-center gap-4 sm:gap-5">

            <div className="text-right">

              <p className="text-xs text-orange-400 sm:text-sm">Área do profissional</p>

              <p className="text-lg font-bold leading-tight text-white sm:text-2xl">

                Olá, {name}!

              </p>

              <button

                type="button"

                onClick={() => void handleLogout()}

                className="mt-1 text-sm text-zinc-400 transition hover:text-orange-400"

              >

                Sair

              </button>

            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-black">

              {avatarUrl ? (

                // Se a URL da foto estiver inválida, mostra o logo em vez de uma imagem quebrada.

                <Image

                  src={avatarUrl}

                  alt="Foto do profissional"

                  width={56}

                  height={56}

                  className="h-full w-full object-cover"
            unoptimized

                  onError={() => setAvatarUrl("")}

                />

              ) : (

                <span className="text-xl font-bold text-orange-400">

                  {name.charAt(0).toUpperCase()}

                </span>

              )}

            </div>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">

        <button

          type="button"

          onClick={() => router.push("/profissional")}

          className="mb-7 text-sm font-semibold text-orange-400 transition hover:text-orange-300"

        >

          ← Voltar para minha área

        </button>

        <div className="mb-8">

          <div className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-400">

            Serviços

          </div>

          <h1 className="mt-4 text-3xl font-bold">Minhas competências</h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">

            Selecione os serviços que você está habilitado a executar. Essas competências serão usadas pela VemGO para encontrar oportunidades compatíveis com seu perfil.

          </p>

        </div>

        {message && (

          <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">

            {message}

          </div>

        )}

        {error && (

          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">

            {error}

          </div>

        )}

        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_260px_auto]">

          <input

            type="search"

            value={search}

            onChange={(event) => setSearch(event.target.value)}

            placeholder="Buscar por serviço ou código..."

            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"

          />

          <select

            value={categoryFilter}

            onChange={(event) => setCategoryFilter(event.target.value)}

            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"

          >

            <option value="all">Todas as categorias</option>

            {categories.map((category) => (

              <option key={category.id} value={category.id}>

                {category.name}

              </option>

            ))}

          </select>

          <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm">

            <span className="text-zinc-400">Selecionados:</span>

            <span className="ml-2 font-bold text-orange-400">{selectedServices.size}</span>

          </div>

        </div>

        {filteredServices.length === 0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">

            <p className="font-semibold text-zinc-300">Nenhum serviço encontrado.</p>

            <p className="mt-2 text-sm text-zinc-500">Tente alterar a busca ou a categoria.</p>

          </div>

        ) : (

          <div className="space-y-6">

            {groupedServices.map(({ category, services: categoryServices }) => (

              <section

                key={category?.id || categoryServices[0]?.category_id || "sem-categoria"}

                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"

              >

                <div className="mb-5">

                  <h2 className="text-lg font-bold text-white">

                    {category?.name || "Serviços sem categoria"}

                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">{categoryServices.length} serviço(s)</p>

                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                  {categoryServices.map((service) => {

                    const selected = selectedServices.has(service.id);

                    return (

                      <button

                        key={service.id}

                        type="button"

                        onClick={() => toggleService(service.id)}

                        className={`rounded-xl border p-4 text-left transition ${

                          selected

                            ? "border-orange-500 bg-orange-950/20"

                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"

                        }`}

                      >

                        <div className="flex items-start gap-3">

                          <div

                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${

                              selected

                                ? "border-orange-500 bg-orange-500 text-black"

                                : "border-zinc-700 text-transparent"

                            }`}

                          >

                            ✓

                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-semibold text-orange-400">{service.code}</p>

                            <p className="mt-1 font-semibold leading-5 text-white">{service.name}</p>

                            {service.description && (

                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">

                                {service.description}

                              </p>

                            )}

                          </div>

                        </div>

                      </button>

                    );

                  })}

                </div>

              </section>

            ))}

          </div>

        )}

        <div className="sticky bottom-0 mt-8 border-t border-zinc-800 bg-[#0C0A09]/95 py-5 backdrop-blur">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <p className="font-semibold text-zinc-200">

                {selectedServices.size} serviço(s) selecionado(s)

              </p>

              <p className="mt-1 text-xs text-zinc-500">

                Mantenha apenas os serviços que você realmente executa.

              </p>

            </div>

            <button

              type="button"

              onClick={() => void handleSave()}

              disabled={saving || selectedServices.size === 0}

              className="rounded-xl bg-orange-500 px-7 py-3 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"

            >

              {saving ? "Salvando..." : "Salvar competências"}

            </button>

          </div>

        </div>

      </section>

    </main>

  );

}
