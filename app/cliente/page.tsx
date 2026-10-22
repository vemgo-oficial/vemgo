

"use client";



import Image from "next/image";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAccessibleDrawer, useDrawerInteractions } from "@/components/vemgo/useAccessibleDrawer";
import { PortalHeaderBar, PortalNavigationDrawer } from "@/components/vemgo/PortalLayout";



type Address = {

  id: string;

  label: string;

  recipient_name: string | null;

  street: string;

  number: string;

  complement: string | null;

  neighborhood: string;

  city: string;

  state: string;

  is_default: boolean;

};



type ActiveRequest = {

  id: string;

  description: string | null;

  status: string;

  created_at: string;

  service: { name: string; code: string } | null;

};



const categories = [
  { name: "Eletricista", icon: "⚡", description: "Instalações e reparos" },
  { name: "Encanador", icon: "🔧", description: "Torneiras e vazamentos" },
  { name: "Chaveiro", icon: "🔑", description: "Chaves e fechaduras" },
  { name: "Faz-tudo", icon: "🛠️", description: "Pequenos reparos" },
  { name: "Montador de móveis", icon: "🪑", description: "Montagem e ajustes" },
  { name: "Ar-condicionado", icon: "❄️", description: "Instalação e manutenção" },
  { name: "Borracheiro", icon: "🛞", description: "Pneus e borracharia" },
  { name: "Mecânico", icon: "⚙️", description: "Cuidados com seu veículo" },
  { name: "Personal Trainer", icon: "💪", description: "Treino e condicionamento" },
  { name: "Fretes & Mudanças", icon: "🚚", description: "Transporte e mudanças" },
  { name: "Informática", icon: "💻", description: "Suporte técnico" },
  { name: "Caçambas & Resíduos", icon: "🗑️", description: "Retirada de resíduos" },
  { name: "Lavagem Automotiva", icon: "🚗", description: "Limpeza do veículo" },
  { name: "Limpeza & Conservação", icon: "🧹", description: "Limpeza de ambientes" },
  { name: "Água & Gás", icon: "💧", description: "Abastecimento e instalações" },
];

const categoryBannerImages = [
  "/images/servicos/01-eletricista.jpg",
  "/images/servicos/02-encanador.jpg",
  "/images/servicos/03-chaveiro.jpg",
  "/images/servicos/04-faz-tudo.jpg",
  "/images/servicos/05-montador-de-moveis.jpg",
  "/images/servicos/06-ar-condicionado.jpg",
  "/images/servicos/07-borracheiro.jpg",
  "/images/servicos/08-mecanico.jpg",
  "/images/servicos/09-personal-trainer.jpg",
  "/images/servicos/10-fretes-mudancas.jpg",
  "/images/servicos/11-informatica.jpg",
  "/images/servicos/12-cacambas-residuos.jpg",
  "/images/servicos/13-lavagem-automotiva.jpg",
  "/images/servicos/14-limpeza-conservacao.jpg",
  "/images/servicos/15-agua-gas.jpg",
];

const featuredServices = [

  {

    name: "Troca de lâmpadas",

    description: "Serviço elétrico residencial",

    image: "/images/servicos/01-eletricista.jpg",

    category: "Eletricista",

  },

  {

    name: "Reparos hidráulicos",

    description: "Torneiras, sifões e vazamentos",

    image: "/images/servicos/02-encanador.jpg",

    category: "Encanador",

  },

  {

    name: "Manutenção residencial",

    description: "Reparos para sua casa",

    image: "/images/servicos/04-faz-tudo.jpg",

    category: "Faz-tudo",

  },

  {

    name: "Montagem de móveis",

    description: "Montagem e pequenos ajustes",

    image: "/images/servicos/05-montador-de-moveis.jpg",

    category: "Montador de móveis",

  },

];







function Icon({

  name,

  size = 22,

}: {

  name: "menu" | "search" | "bell" | "close" | "arrow" | "logout";

  size?: number;

}) {

  const common = {

    width: size,

    height: size,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",

    strokeWidth: 1.8,

    strokeLinecap: "round" as const,

    strokeLinejoin: "round" as const,

    "aria-hidden": true as const,

  };



  switch (name) {

    case "menu":

      return (

        <svg {...common}>

          <path d="M4 6h16M4 12h16M4 18h16" />

        </svg>

      );

    case "search":

      return (

        <svg {...common}>

          <circle cx="10.8" cy="10.8" r="6.8" />

          <path d="m16 16 4.5 4.5" />

        </svg>

      );

    case "bell":

      return (

        <svg {...common}>

          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

          <path d="M10 21h4" />

        </svg>

      );

    case "close":

      return (

        <svg {...common}>

          <path d="m18 6-12 12M6 6l12 12" />

        </svg>

      );

    case "arrow":

      return (

        <svg {...common}>

          <path d="M4 12h15M13 5l7 7-7 7" />

        </svg>

      );

    case "logout":

      return (

        <svg {...common}>

          <path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />

          <path d="m16 17 5-5-5-5M21 12H9" />

        </svg>

      );

  }

}



export default function ClientePage() {

  const router = useRouter();



  const [name, setName] = useState("Cliente");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [emailVerified, setEmailVerified] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);

  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuInteractions = useDrawerInteractions(menuOpen, setMenuOpen);
  const menuDialogRef = useAccessibleDrawer(menuOpen, setMenuOpen, menuButtonRef, menuInteractions.focusOnOpen, menuInteractions.clearFocus);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");
  const [bannerImage, setBannerImage] = useState(categoryBannerImages[0]);
  const categoriesTrackRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    if (categoryBannerImages.length < 2) return;

    // Executa a escolha após o efeito inicial, evitando atualização síncrona
    // de estado dentro do corpo do effect e mantendo compatibilidade com SSR.
    const frameId = window.requestAnimationFrame(() => {
      const storageKey = "vemgo-client-banner-last";
      let previousImage = "";

      try {
        previousImage = window.sessionStorage.getItem(storageKey) || "";
      } catch {
        previousImage = "";
      }

      const availableImages = categoryBannerImages.filter(
        (image) => image !== previousImage,
      );
      const pool = availableImages.length > 0 ? availableImages : categoryBannerImages;
      const nextImage = pool[Math.floor(Math.random() * pool.length)];

      setBannerImage(nextImage);

      try {
        window.sessionStorage.setItem(storageKey, nextImage);
      } catch {
        // A seleção aleatória continua funcionando se o armazenamento estiver bloqueado.
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const selectedAddress = addresses.find(

    (address) => address.id === selectedAddressId,

  );



  useEffect(() => {

    let cancelled = false;



    async function loadClient() {

      const supabase = createSupabaseBrowserClient();



      const {

        data: { user },

      } = await supabase.auth.getUser();



      if (!user) {

        router.replace("/login");

        return;

      }



      if (cancelled) return;



      setEmailVerified(Boolean(user.email_confirmed_at));



      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("full_name, avatar_url, user_type, status")

        .eq("id", user.id)

        .maybeSingle();



      if (cancelled) return;



      if (

        profileError ||

        !profile ||

        profile.user_type !== "client" ||

        profile.status === "blocked"

      ) {

        router.replace("/login");

        return;

      }



      setName(profile.full_name || "Cliente");



      if (profile.avatar_url) {

        const storedAvatar = String(profile.avatar_url);



        if (/^https?:\/\//i.test(storedAvatar)) {

          setAvatarUrl(storedAvatar);

        } else {

          const { data: signedImage } = await supabase.storage

            .from("profile-photos")

            .createSignedUrl(storedAvatar, 3600);



          if (!cancelled && signedImage?.signedUrl) {

            setAvatarUrl(signedImage.signedUrl);

          }

        }

      }



      const { data: addressData, error: addressError } = await supabase

        .from("addresses")

        .select(

          "id, label, recipient_name, street, number, complement, neighborhood, city, state, is_default",

        )

        .eq("profile_id", user.id)

        .order("is_default", { ascending: false })

        .order("created_at", { ascending: false });



      if (cancelled) return;



      if (addressError) {

        setError("Não foi possível carregar seus endereços.");

      } else {

        const loaded = (addressData || []) as Address[];

        setAddresses(loaded);



        const defaultAddress =

          loaded.find((address) => address.is_default) || loaded[0];



        if (defaultAddress) setSelectedAddressId(defaultAddress.id);

      }



      const { data: requestData, error: requestError } = await supabase

        .from("requests")

        .select(

          "id, description, status, created_at, service:services(name, code)",

        )

        .eq("client_id", user.id)

        .not("status", "in", '("completed","cancelled","expired")')

        .order("created_at", { ascending: false })

        .limit(5);



      if (cancelled) return;



      if (!requestError) {

        setActiveRequests(

          (requestData ?? []) as unknown as ActiveRequest[],

        );

      }



    }



    void loadClient()
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível carregar os dados do painel do cliente.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });



    return () => {

      cancelled = true;

    };

  }, [router]);



  async function handleLogout() {

    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/login");

  }



  function goTo(route: string) {

    menuInteractions.clearFocus();
    setMenuOpen(false);

    setNotificationsOpen(false);

    router.push(route);

  }



  function classifyService(text: string): string | null {

    const normalized = text

      .toLowerCase()

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .replace(/[.,!?;:]/g, " ")

      .replace(/\s+/g, " ")

      .trim();



    if (normalized.includes("lampada")) {

      if (/\b(instalar|instalacao|colocar|montar)\b/.test(normalized)) {

        if (/\b(3|tres)\b/.test(normalized)) return "ELE-026";

        if (/\b(2|duas)\b/.test(normalized)) return "ELE-025";

        return "ELE-024";

      }



      if (

        /\b(queimou|queimada|queimadas|trocar|troca|substituir|substituicao)\b/.test(

          normalized,

        )

      ) {

        if (/\b(3|tres)\b/.test(normalized)) return "ELE-029";

        if (/\b(2|duas)\b/.test(normalized)) return "ELE-028";

        return "ELE-027";

      }



      return null;

    }



    if (normalized.includes("tomada")) {

      if (

        normalized.includes("sem energia") ||

        normalized.includes("nao funciona") ||

        normalized.includes("nao tem energia")

      ) {

        return "ELE-004";

      }



      if (/\b(instalar|instalacao|colocar)\b/.test(normalized)) {

        return normalized.includes("20a") ? "ELE-011" : "ELE-009";

      }



      if (/\b(trocar|troca|substituir|substituicao)\b/.test(normalized)) {

        return normalized.includes("20a") ? "ELE-012" : "ELE-010";

      }



      return null;

    }



    if (normalized.includes("chuveiro")) {

      if (normalized.includes("resistencia")) return "ELE-062";

      if (/\b(instalar|instalacao|colocar)\b/.test(normalized)) {

        return "ELE-060";

      }

      if (/\b(trocar|troca|substituir|substituicao)\b/.test(normalized)) {

        return "ELE-061";

      }

      return "ELE-007";

    }



    if (

      normalized.includes("disjuntor") &&

      /\b(desarma|cai|desarmando)\b/.test(normalized)

    ) {

      return "ELE-003";

    }



    if (

      normalized.includes("falta de energia") ||

      normalized.includes("sem energia no circuito")

    ) {

      return "ELE-002";

    }



    if (

      normalized.includes("curto circuito") ||

      normalized.includes("curto-circuito")

    ) {

      return "ELE-006";

    }



    if (

      normalized.includes("iluminacao") ||

      normalized.includes("luz") ||

      normalized.includes("luminaria")

    ) {

      return "ELE-005";

    }



    return null;

  }



  async function handleRequest(text = description) {

    setError("");

    setMessage("");



    const trimmedDescription = text.trim();



    if (!trimmedDescription) {

      setError("Digite o serviço que você precisa.");

      return;

    }



    if (!emailVerified) {

      setError("Confirme seu e-mail antes de solicitar um serviço.");

      router.push("/cliente/verificacao");

      return;

    }



    if (!selectedAddressId) {

      setError("Cadastre ou selecione o endereço do serviço.");

      return;

    }



    setSending(true);



    try {

      const supabase = createSupabaseBrowserClient();



      const {

        data: { user },

      } = await supabase.auth.getUser();



      if (!user) {

        router.replace("/login");

        return;

      }



      if (!user.email_confirmed_at) {

        setEmailVerified(false);

        setError("Confirme seu e-mail antes de solicitar um serviço.");

        router.push("/cliente/verificacao");

        return;

      }



      const serviceCode = classifyService(trimmedDescription);



      if (!serviceCode) {

        setError(

          "Não identificamos esse serviço automaticamente. Tente descrever o problema de forma mais específica.",

        );

        return;

      }



      const { data: service, error: serviceError } = await supabase

        .from("services")

        .select("id, code, name")

        .eq("code", serviceCode)

        .eq("is_active", true)

        .maybeSingle();



      if (serviceError || !service) {

        setError("O serviço identificado não está disponível no catálogo.");

        return;

      }



      const { data: request, error: requestError } = await supabase

        .from("requests")

        .insert({

          client_id: user.id,

          service_id: service.id,

          address_id: selectedAddressId,

          description: trimmedDescription,

          urgency: "normal",

          status: "pending",

        })

        .select("id")

        .single();



      if (requestError || !request) {

        setError(

          requestError?.message || "Não foi possível criar sua solicitação.",

        );

        return;

      }



      const { error: classifyError } = await supabase.rpc(

        "classify_request",

        { p_request_id: request.id },

      );



      if (classifyError) {

        setError(classifyError.message);

        return;

      }



      const { error: matchError } = await supabase.rpc("match_request", {

        p_request_id: request.id,

      });



      if (matchError) {

        setError(matchError.message);

        return;

      }



      setDescription("");

      setMessage(`Solicitação criada: ${service.name}.`);



      window.setTimeout(() => {

        router.push(`/cliente/agendamento/${request.id}`);

      }, 500);

    } catch {

      setError("Ocorreu um erro ao criar sua solicitação.");

    } finally {

      setSending(false);

    }

  }



  if (loading) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-[#080b0a] text-white">

        <div className="text-center">

          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />

          <p className="mt-4 text-sm text-zinc-400">Preparando sua VemGO...</p>

        </div>

      </main>

    );

  }



  return (

    <main className="min-h-[calc(100vh-4rem)] bg-[#080b0a] text-white">

      <PortalHeaderBar role="client" menuOpen={menuOpen} menuButtonRef={menuButtonRef} interactions={menuInteractions}>
          <button

            type="button"

            onClick={() => goTo("/cliente/enderecos")}

            className="ml-1 hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left transition hover:border-emerald-500/40 lg:flex"

            title="Selecionar endereço"

          >

            <span className="text-lg text-emerald-400">⌖</span>

            <span className="max-w-[145px]">

              <span className="block truncate text-xs font-semibold text-zinc-200">

                {selectedAddress ? `${selectedAddress.state} · ${selectedAddress.city}` : "Definir localização"}

              </span>

              <span className="block text-[11px] text-zinc-500">

                {selectedAddress ? (selectedAddress.label || "Endereço principal") : "Use seu endereço principal"}

              </span>

            </span>

            <span className="ml-1 text-xs text-zinc-500">⌄</span>

          </button>



          <form

            className="ml-auto hidden w-full min-w-0 max-w-[380px] flex-1 md:block"

            onSubmit={(event) => {

              event.preventDefault();

              void handleRequest(searchText);

            }}

          >

            <div className="flex h-11 items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-4 transition focus-within:border-emerald-500/50">

              <span className="text-emerald-400">

                <Icon name="search" size={20} />

              </span>

              <input

                value={searchText}

                onChange={(event) => setSearchText(event.target.value)}

                placeholder="Buscar serviço ou categoria..."

                aria-label="Buscar serviço ou categoria"

                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"

              />

            </div>

          </form>



          <button
            type="button"
            onClick={() => goTo("/cliente/recurso-indisponivel/vemgo-pay")}
            aria-label="Ver informações do VemGO Pay"
            title="VemGO Pay — integração indisponível nesta versão local"
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/[0.12] 2xl:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">$</span>
            <span>
              <span className="block text-xs font-bold text-white">VemGO Pay</span>
              <span className="block text-[10px] text-zinc-400">Saldo em breve</span>
            </span>
          </button>

          <div className="relative">

            <button

              type="button"

              onClick={() => setNotificationsOpen((open) => !open)}

              aria-label="Notificações"

              aria-expanded={notificationsOpen}

              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-white/5 hover:text-emerald-400"

            >

              <Icon name="bell" size={22} />

              {activeRequests.length > 0 && (

                <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-[#080b0a] ${activeRequests.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-400"}`} />

              )}

            </button>



            {notificationsOpen && (

              <div className="absolute right-0 top-12 z-[70] w-[min(320px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#111512] p-4 shadow-2xl">

                <div className="flex items-center justify-between">

                  <h3 className="font-semibold">Notificações</h3>

                  <button

                    type="button"

                    onClick={() => setNotificationsOpen(false)}

                    aria-label="Fechar notificações"

                    className="text-zinc-500 hover:text-white"

                  >

                    <Icon name="close" size={18} />

                  </button>

                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-400">

                  {activeRequests.length > 0

                    ? `Você tem ${activeRequests.length} solicitação(ões) em andamento.`

                    : "Suas atualizações aparecerão aqui quando houver novidades."}

                </p>

                {activeRequests.length > 0 && (

                  <button

                    type="button"

                    onClick={() => goTo("/cliente/servicos")}

                    className="mt-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300"

                  >

                    Ver meus serviços →

                  </button>

                )}

              </div>

            )}

          </div>



          <button

            type="button"

            onClick={() => goTo("/cliente/perfil")}

            className="flex shrink-0 items-center gap-2 rounded-xl py-1 pl-1 pr-0.5 text-left transition hover:bg-white/[0.035] sm:gap-3 sm:pl-2 sm:pr-2"

          >

            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900">

              {avatarUrl ? (

                <Image

                  src={avatarUrl}

                  alt={`Foto de ${name}`}

                  width={40}

                  height={40}

                  unoptimized

                  className="h-full w-full object-cover"

                />

              ) : (

                <span className="font-bold text-emerald-400">

                  {name.charAt(0).toUpperCase()}

                </span>

              )}

            </span>

            <span className="hidden max-w-[135px] xl:block">

              <span className="block truncate text-sm font-semibold">

                Olá, {name.split(" ")[0]}!

              </span>

              <span className="block text-xs text-zinc-500">Cliente</span>

            </span>

            <span className="hidden text-zinc-500 sm:block">⌄</span>

          </button>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair da conta"
            title="Sair"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <Icon name="logout" size={21} />
          </button>


      </PortalHeaderBar>

      <PortalNavigationDrawer role="client" open={menuOpen} onClose={() => { menuInteractions.clearFocus(); setMenuOpen(false); }} menuRef={menuDialogRef} interactions={menuInteractions} />

      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">

        {/* BUSCA NO CELULAR */}

        <form

          className="mb-4 md:hidden"

          onSubmit={(event) => {

            event.preventDefault();

            void handleRequest(searchText);

          }}

        >

          <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#111512] px-4 focus-within:border-emerald-500/50">

            <span className="text-emerald-400">

              <Icon name="search" size={20} />

            </span>

            <input

              value={searchText}

              onChange={(event) => setSearchText(event.target.value)}

              placeholder="Qual serviço você precisa?"

              aria-label="Buscar serviço"

              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"

            />

            <button

              type="submit"

              aria-label="Buscar"

              className="text-emerald-400"

            >

              <Icon name="arrow" size={20} />

            </button>

          </div>

        </form>



        {/* LOCALIZAÇÃO NO CELULAR */}

        <button

          type="button"

          onClick={() => goTo("/cliente/enderecos")}

          className="mb-4 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-left sm:hidden"

        >

          <span className="text-lg text-emerald-400">⌖</span>

          <span className="min-w-0 flex-1">

            <span className="block text-xs text-zinc-500">Local do serviço</span>

            <span className="block truncate text-sm font-medium">

              {selectedAddress

                ? `${selectedAddress.state} · ${selectedAddress.city}`

                : "Definir localização"}

            </span>

          </span>

          <span className="text-zinc-500">⌄</span>

        </button>



        {/* BANNER PRINCIPAL */}

        <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#111612]">

          <div className="absolute inset-0 -z-20">

            <Image

              src={bannerImage}

              alt=""

              fill

              priority

              sizes="100vw"

              className="object-cover object-center opacity-35"

            />

          </div>

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080b0a] via-[#080b0a]/90 to-[#080b0a]/25" />

          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080b0a]/70 via-transparent to-black/10" />



          <div className="grid min-h-[300px] items-center gap-8 p-6 sm:p-9 lg:min-h-[330px] lg:grid-cols-[1.4fr_0.6fr] lg:p-11">

            <div className="max-w-2xl">

              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400 sm:text-sm">

                PRECISOU?

              </p>

              <h1 className="mt-3 whitespace-nowrap text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Chama que <span className="text-emerald-400">vem!</span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">

                Serviços confiáveis para sua casa e seu negócio, com

                praticidade e transparência.

              </p>



              <form

                className="mt-6 flex max-w-xl items-center gap-3 rounded-full border border-emerald-500/50 bg-[#111815]/95 p-1.5 pl-4 shadow-xl shadow-black/20 sm:mt-7"

                onSubmit={(event) => {

                  event.preventDefault();

                  void handleRequest(searchText || description);

                }}

              >

                <span className="shrink-0 text-emerald-400">

                  <Icon name="search" size={23} />

                </span>

                <input

                  value={searchText}

                  onChange={(event) => setSearchText(event.target.value)}

                  placeholder="Qual serviço você precisa?"

                  aria-label="Descreva o serviço que precisa"

                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-zinc-500 sm:text-base"

                />

                <button

                  type="submit"

                  disabled={sending}

                  aria-label="Encontrar serviço"

                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black transition hover:bg-emerald-300 disabled:opacity-50"

                >

                  <Icon name="arrow" size={22} />

                </button>

              </form>



              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">

                <span className="flex items-center gap-2">

                  <span className="text-emerald-400">✓</span>

                  Profissionais verificados

                </span>

                <span className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Mais praticidade
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Transparência
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Vamos resolver?
                </span>

              </div>

            </div>



            <div className="hidden justify-self-end lg:block">

              <div className="w-[230px] space-y-3">

                {[

                  ["✓", "Mais segurança", "Profissionais verificados"],

                  ["$", "Preço transparente", "Consulte as condições do serviço"],

                  ["ϟ", "Praticidade", "Solicite pela plataforma"],

                ].map(([icon, title, subtitle]) => (

                  <div

                    key={title}

                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm"

                  >

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xl text-emerald-400">

                      {icon}

                    </span>

                    <span>

                      <span className="block text-sm font-semibold">{title}</span>

                      <span className="mt-1 block text-xs leading-4 text-zinc-400">

                        {subtitle}

                      </span>

                    </span>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </section>



        {/* FEEDBACK DA SOLICITAÇÃO */}

        {(error || message) && (

          <div

            role={error ? "alert" : "status"}

            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${

              error

                ? "border-red-500/25 bg-red-500/[0.07] text-red-300"

                : "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300"

            }`}

          >

            {error || message}

          </div>

        )}



        {/* CATEGORIAS */}

        <section className="mt-8">

          <div className="mb-4 flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">

                Encontre o que precisa

              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">

                Categorias de serviços

              </h2>

            </div>

          </div>



          <div className="group/category relative">
            <button type="button" aria-label="Rolar categorias para a esquerda" onClick={() => categoriesTrackRef.current?.scrollBy({ left: -360, behavior: "smooth" })} className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white/70 opacity-0 shadow-lg backdrop-blur transition hover:bg-emerald-400 hover:text-black group-hover/category:opacity-100 focus:opacity-100"><span aria-hidden="true" className="text-2xl leading-none">‹</span></button>
            <div ref={categoriesTrackRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button key={category.name} type="button" onClick={() => { setSearchText(category.name); setDescription(category.name); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group min-w-[132px] max-w-[150px] flex-1 snap-start rounded-xl border border-white/[0.09] bg-[#101411] p-3 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.045] sm:min-w-[145px] sm:p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] text-2xl text-emerald-400 transition group-hover:bg-emerald-500/10">{category.icon}</span><span className="mt-3 block text-xs font-semibold leading-5 text-zinc-100 sm:text-sm">{category.name}</span><span className="mt-1 hidden text-xs leading-4 text-zinc-500 xl:block">{category.description}</span>
                </button>
              ))}
            </div>
            <button type="button" aria-label="Rolar categorias para a direita" onClick={() => categoriesTrackRef.current?.scrollBy({ left: 360, behavior: "smooth" })} className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white/70 opacity-0 shadow-lg backdrop-blur transition hover:bg-emerald-400 hover:text-black group-hover/category:opacity-100 focus:opacity-100"><span aria-hidden="true" className="text-2xl leading-none">›</span></button>
          </div>

        </section>



        {/* BANNER CLUBE VEMGO+ */}
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#101512]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#111a15] via-[#0c110e] to-[#11100b]" />
          <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-[75px]" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-3xl font-bold text-emerald-400">✦</div>
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Vantagens para você</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Conheça o <span className="text-emerald-400">Clube VemGO+</span></h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Um espaço para conhecer as vantagens e novidades que estamos preparando para a comunidade VemGO.</p>
              </div>
            </div>
            <button type="button" onClick={() => goTo("/cliente/recurso-indisponivel/clube-vemgo")} className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-black">
              Conhecer o VemGO+ <Icon name="arrow" size={18} />
            </button>
          </div>
        </section>

        {/* SERVIÇOS EM DESTAQUE */}

        <section className="mt-8">

          <div className="mb-4 flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">

                Para facilitar sua rotina

              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">

                Serviços em destaque

              </h2>

            </div>

            <button

              type="button"

              onClick={() => goTo("/cliente/servicos")}

              className="shrink-0 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 sm:text-sm"

            >

              Ver todos <span aria-hidden="true">→</span>

            </button>

          </div>



          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {featuredServices.map((service) => (

              <button

                key={service.name}

                type="button"

                onClick={() => {

                  setSearchText(service.name);

                  setDescription(service.name);

                  document

                    .getElementById("solicitar-servico")

                    ?.scrollIntoView({ behavior: "smooth", block: "center" });

                }}

                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#101411] text-left transition hover:-translate-y-0.5 hover:border-emerald-500/35"

              >

                <div className="relative h-40 overflow-hidden sm:h-44">

                  <Image

                    src={service.image}

                    alt={`Serviço de ${service.category}`}

                    fill

                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"

                    className="object-cover transition duration-500 group-hover:scale-105"

                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />

                  <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">

                    {service.category}

                  </span>

                </div>



                <div className="flex items-center gap-3 p-4">

                  <span className="min-w-0 flex-1">

                    <span className="block text-sm font-bold">

                      {service.name}

                    </span>

                    <span className="mt-1 block text-xs text-zinc-500">

                      {service.description}

                    </span>

                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black transition group-hover:bg-emerald-300">

                    <Icon name="arrow" size={18} />

                  </span>

                </div>

              </button>

            ))}

          </div>

        </section>



        {/* SOLICITAÇÕES EM ANDAMENTO */}

        {activeRequests.length > 0 && (

          <section className="mt-8">

            <div className="mb-4">

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">

                Acompanhamento

              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">

                Seus serviços em andamento

              </h2>

            </div>



            <div className="grid gap-3 lg:grid-cols-2">

              {activeRequests.map((request) => (

                <button

                  key={request.id}

                  type="button"

                  onClick={() =>

                    goTo(`/cliente/agendamento/${request.id}`)

                  }

                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#101411] p-4 text-left transition hover:border-emerald-500/35"

                >

                  <span className="min-w-0">

                    <span className="block truncate text-sm font-semibold">

                      {request.service?.name || "Solicitação de serviço"}

                    </span>

                    <span className="mt-1 block text-xs text-zinc-500">

                      {request.status === "in_progress"

                        ? "Atendimento em andamento"

                        : request.status === "scheduled"

                          ? "Agendamento confirmado"

                          : request.status === "accepted"

                            ? "Atendimento confirmado"

                            : "Solicitação em andamento"}

                    </span>

                  </span>

                  <span className="shrink-0 text-emerald-400">

                    <Icon name="arrow" size={20} />

                  </span>

                </button>

              ))}

            </div>

          </section>

        )}



        {/* BANNER VEMGO PAY */}
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#101512]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#102019] via-[#0c110e] to-[#11100b]" />
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.10] blur-[75px]" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-3xl font-bold text-emerald-400">
                $
              </div>
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Pagamentos na VemGO
                </p>
                <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  Conheça o <span className="text-emerald-400">VemGO Pay</span>
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Nosso espaço para pagamentos e movimentações da plataforma.
                  Consulte o estado da integração VemGO Pay nesta versão local.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Consulta de saldo e transações estará disponível quando a carteira for ativada.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => goTo("/cliente/recurso-indisponivel/vemgo-pay")}
              className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-black"
            >
              Ver informações do VemGO Pay <Icon name="arrow" size={18} />
            </button>
          </div>
        </section>


        <footer className="mt-10 border-t border-white/[0.07] py-5 text-center">

          <p className="text-xs text-zinc-600">

            VemGO · Serviço rápido. Preço certo. Chama que vem!

          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">

            <button

              type="button"

              onClick={() => router.push("/privacidade")}

              className="hover:text-emerald-400"

            >

              Privacidade

            </button>

            <button

              type="button"

              onClick={() => router.push("/termos")}

              className="hover:text-emerald-400"

            >

              Termos do cliente

            </button>

          </div>

        </footer>

      </div>

    </main>

  );

}
