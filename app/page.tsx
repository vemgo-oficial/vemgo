
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const services = [
  {
    name: "Eletricista",
    description: "Instalações e reparos elétricos",
    image: "/images/servicos/01-eletricista.jpg",
  },
  {
    name: "Encanador",
    description: "Torneiras, sifões e vazamentos",
    image: "/images/servicos/02-encanador.jpg",
  },
  {
    name: "Chaveiro",
    description: "Fechaduras e abertura de portas",
    image: "/images/servicos/03-chaveiro.jpg",
  },
  {
    name: "Faz-tudo",
    description: "Pequenos reparos residenciais",
    image: "/images/servicos/04-faz-tudo.jpg",
  },
  {
    name: "Montador de móveis",
    description: "Montagem e ajustes",
    image: "/images/servicos/05-montador-de-moveis.jpg",
  },
  {
    name: "Ar-condicionado",
    description: "Instalação e manutenção",
    image: "/images/servicos/06-ar-condicionado.jpg",
  },
  {
    name: "Borracheiro",
    description: "Pneus e reparos automotivos",
    image: "/images/servicos/07-borracheiro.jpg",
  },
  {
    name: "Mecânico",
    description: "Manutenção de veículos",
    image: "/images/servicos/08-mecanico.jpg",
  },
  {
    name: "Personal Trainer",
    description: "Treinamento físico",
    image: "/images/servicos/09-personal-trainer.jpg",
  },
  {
    name: "Fretes & Mudanças",
    description: "Transporte e movimentação",
    image: "/images/servicos/10-fretes-e-mudancas.jpg",
  },
  {
    name: "Informática",
    description: "Computadores e suporte técnico",
    image: "/images/servicos/11-informatica.jpg",
  },
  {
    name: "Caçambas & Resíduos",
    description: "Retirada de resíduos",
    image: "/images/servicos/12-cacambas-e-residuos.jpg",
  },
  {
    name: "Lavagem Automotiva",
    description: "Cuidados com seu veículo",
    image: "/images/servicos/13-lavagem-automotiva.jpg",
  },
  {
    name: "Limpeza & Conservação",
    description: "Limpeza de ambientes",
    image: "/images/servicos/14-limpeza-e-conservacao.jpg",
  },
  {
    name: "Água & Gás",
    description: "Soluções para abastecimento",
    image: "/images/servicos/15-agua-e-gas.jpg",
  },
];

function getServiceImage(image: string) {
  return image;
}

function ServiceCard({
  service,
}: {
  service: (typeof services)[number];
}) {
  return (
    <article className="group relative h-[225px] w-[245px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 sm:h-[245px] sm:w-[275px]">
      <div
        role="img"
        aria-label={`Imagem ilustrativa: ${service.name}`}
        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url("${getServiceImage(service.image)}")`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-lg font-semibold text-white">{service.name}</h3>
        <p className="mt-1 text-sm leading-5 text-zinc-300">
          {service.description}
        </p>
      </div>
    </article>
  );
}

function ServiceCarousel({
  items,
  label,
}: {
  items: typeof services;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector<HTMLElement>("article");
    if (!card) return;

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap) || 16;

    track.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <div className="group/carousel relative">
      <button
        type="button"
        aria-label={`Ver serviço anterior — ${label}`}
        onClick={() => move(-1)}
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white opacity-100 shadow-lg backdrop-blur transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:group-focus-within/carousel:opacity-100"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div
        ref={trackRef}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      <button
        type="button"
        aria-label={`Próximo serviço — ${label}`}
        onClick={() => move(1)}
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white opacity-100 shadow-lg backdrop-blur transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:group-focus-within/carousel:opacity-100"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [showAccess, setShowAccess] = useState(false);

  function handleSearch() {
    setShowAccess(true);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#090b0a] text-white">
      {/* CABEÇALHO FIXO */}
      <div className="fixed inset-x-0 top-0 z-[100] bg-[#090b0a]">
        <header className="border-b border-white/10 bg-[#090b0a]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
            <Link href="/" aria-label="VemGO - Início" className="shrink-0">
              <Image
                src="/logo-vemgo-transparente.png"
                alt="VemGO"
                width={1751}
                height={465}
                priority
                className="h-auto w-[140px] object-contain sm:w-[160px]"
              />
            </Link>

            <nav
              aria-label="Navegação principal"
              className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/10 pt-3 text-sm lg:order-none lg:w-auto lg:border-0 lg:pt-0"
            >
              <Link href="/" className="text-white transition hover:text-zinc-300">
                Início
              </Link>

              <a href="#sobre" className="text-zinc-400 transition hover:text-white">
                Sobre
              </a>

              <a
                href="#como-funciona"
                className="text-zinc-400 transition hover:text-white"
              >
                Como funciona
              </a>

              <a href="#servicos" className="text-zinc-400 transition hover:text-white">
                Serviços
              </a>

              <Link
                href="/privacidade"
                className="text-zinc-400 transition hover:text-white"
              >
                Privacidade
              </Link>

              <Link href="/termos" className="text-zinc-400 transition hover:text-white">
                Termos
              </Link>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => router.push("/cadastro")}
                className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white sm:px-4"
              >
                Criar conta
              </button>
            </div>
          </div>
        </header>

        {/* BARRAS DE ENERGIA */}
        <div
          aria-hidden="true"
          className="flex h-[5px] flex-col gap-px overflow-hidden"
        >
          <div className="h-px overflow-hidden bg-emerald-500/20">
            <div className="energy-fill h-full w-[28%] bg-emerald-400" />
          </div>
          <div className="h-px overflow-hidden bg-orange-500/20">
            <div className="energy-fill energy-orange h-full w-[28%] bg-orange-400" />
          </div>
          <div className="h-px overflow-hidden bg-blue-500/20">
            <div className="energy-fill energy-blue h-full w-[28%] bg-blue-400" />
          </div>
        </div>
      </div>

      {/* ESPAÇO PARA O CABEÇALHO FIXO */}
      <div aria-hidden="true" className="h-[125px] sm:h-[125px] lg:h-[74px]" />

      <style jsx>{`
        .energy-fill {
          animation: energy-loading 3.6s ease-in-out infinite;
        }

        .energy-orange {
          animation-delay: 0.35s;
        }

        .energy-blue {
          animation-delay: 0.7s;
        }

        @keyframes energy-loading {
          0% {
            transform: translateX(-120%);
            opacity: 0.4;
          }
          50% {
            transform: translateX(180%);
            opacity: 1;
          }
          100% {
            transform: translateX(400%);
            opacity: 0.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .energy-fill {
            animation: none;
            transform: translateX(0);
            opacity: 0.8;
          }
        }
      `}</style>

      {/* APRESENTAÇÃO PRINCIPAL */}
      <section className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[480px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[130px]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-xs font-medium text-zinc-300 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-zinc-300" />
              SERVIÇO RÁPIDO. PREÇO CERTO. CHAMA QUE VEM!
            </span>

            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Seu problema tem solução.
              <span className="mt-2 block text-zinc-300">
                A VemGO conecta você.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              Conte o que você precisa resolver e conheça a proposta de
              encontrar profissionais compatíveis com sua necessidade.
            </p>

            <form
              className="mt-9 max-w-2xl"
              onSubmit={(event) => {
                event.preventDefault();
                handleSearch();
              }}
            >
              <label
                htmlFor="service-need"
                className="mb-3 block text-sm font-medium text-zinc-300"
              >
                O que você precisa resolver?
              </label>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/90 p-2 shadow-2xl shadow-black/30 sm:flex-row">
                <input
                  id="service-need"
                  type="text"
                  value={need}
                  onChange={(event) => setNeed(event.target.value)}
                  placeholder="Ex.: preciso trocar uma torneira"
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-4 text-base text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-black/20"
                />

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 font-semibold text-zinc-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4" />
                  </svg>
                  Encontrar serviço
                </button>
              </div>
            </form>

            {showAccess && (
              <div
                role="dialog"
                aria-labelledby="access-title"
                className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
              >
                <h2 id="access-title" className="font-semibold text-white">
                  Vamos dar o próximo passo?
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {need.trim()
                    ? `Sua necessidade: "${need.trim()}". Para continuar, entre na sua conta ou crie um cadastro.`
                    : "Entre na sua conta ou crie um cadastro para continuar."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/cadastro")}
                    className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    Criar conta
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Já tenho cadastro
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAccess(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
              <span>✓ Necessidade organizada</span>
              <span>✓ Serviços identificados</span>
              <span>✓ Profissionais compatíveis</span>
            </div>
          </div>

          {/* PAINEL VISUAL */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111411] p-3 shadow-2xl shadow-black/50 sm:p-4">
              <div className="flex items-center justify-between gap-4 px-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Soluções para sua rotina
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Serviços para o dia a dia
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  VemGO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {services.slice(0, 2).map((service) => (
                  <div
                    key={service.name}
                    className="relative h-[230px] overflow-hidden rounded-2xl bg-zinc-800 sm:h-[270px]"
                  >
                    <div
                      role="img"
                      aria-label={`Imagem ilustrativa: ${service.name}`}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${getServiceImage(service.image)}")`,
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    <p className="absolute bottom-4 left-4 font-semibold text-white">
                      {service.name}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 sm:p-5">
                <p className="font-semibold text-white">
                  Um jeito mais organizado de encontrar serviços.
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Descreva sua necessidade e comece por aqui.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGMENTOS DE SERVIÇOS */}
      <section
        id="servicos"
        className="scroll-mt-32 border-t border-white/[0.07] bg-[#0c0f0d] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Nossos segmentos
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Serviços para diferentes necessidades.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Use as setas para explorar os segmentos previstos para a VemGO.
              </p>
            </div>

            <span className="text-sm text-zinc-500">15 segmentos</span>
          </div>

          <div className="mt-9 space-y-5">
            <ServiceCarousel
              items={services.slice(0, 8)}
              label="Primeira faixa de serviços"
            />
            <ServiceCarousel
              items={services.slice(8, 15)}
              label="Segunda faixa de serviços"
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Imagens ilustrativas. A disponibilidade depende da implantação
            e da cobertura de profissionais em cada localidade.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section
        id="como-funciona"
        className="scroll-mt-32 border-t border-white/[0.07] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Do problema ao serviço.
            </h2>
            <p className="mt-4 leading-7 text-zinc-400">
              A proposta é organizar a necessidade do cliente e facilitar a
              conexão com profissionais compatíveis.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Conte sua necessidade",
                description:
                  "Explique com suas palavras o que precisa resolver.",
              },
              {
                number: "02",
                title: "Identifique o serviço",
                description:
                  "A plataforma organiza a necessidade para direcioná-la ao serviço correspondente.",
              },
              {
                number: "03",
                title: "Encontre profissionais",
                description:
                  "Conheça profissionais compatíveis conforme a disponibilidade.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-white/10 bg-[#101311] p-6 sm:p-7"
              >
                <span className="text-sm font-semibold tracking-wider text-zinc-400">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENTES */}
      <section className="border-t border-white/[0.07] bg-[#0b100d] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#101b14] p-7 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-500/[0.08] blur-[90px]" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Para clientes
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Resolva o que precisa. Comece por aqui.
                </h2>
                <p className="mt-4 leading-7 text-zinc-300">
                  Crie sua conta para começar a utilizar a plataforma quando
                  os serviços correspondentes estiverem disponíveis.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                  Criar conta de cliente
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-500/30 px-6 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  Já tenho cadastro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROFISSIONAIS */}
      <section className="border-t border-white/[0.07] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#17110d] p-7 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-orange-500/[0.08] blur-[90px]" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                  Para profissionais
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Leve seus serviços para a VemGO.
                </h2>
                <p className="mt-4 leading-7 text-zinc-300">
                  Conheça o processo de cadastro e prepare seu perfil
                  profissional para participar da plataforma.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro-profissional"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                >
                  Quero me cadastrar
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-orange-500/30 px-6 py-3 text-sm font-medium text-orange-200 transition hover:bg-orange-500/10"
                >
                  Já tenho cadastro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section
        id="sobre"
        className="scroll-mt-32 border-t border-white/[0.07] bg-[#0c0f0d] py-16 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Sobre a VemGO
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Mais clareza para encontrar serviços.
            </h2>
          </div>

          <p className="text-base leading-8 text-zinc-400">
            A VemGO está sendo desenvolvida para aproximar pessoas que
            precisam resolver problemas do cotidiano de profissionais que
            oferecem serviços. A proposta é tornar a busca mais organizada,
            clara e prática.
          </p>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-white/10 bg-[#070907]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <Link href="/" aria-label="VemGO - Início">
                <Image
                  src="/logo-vemgo-transparente.png"
                  alt="VemGO"
                  width={1751}
                  height={465}
                  className="h-auto w-[145px] object-contain"
                />
              </Link>

              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Serviço rápido. Preço certo. Chama que vem!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-10 gap-y-7 text-sm sm:grid-cols-3">
              <div>
                <h3 className="font-semibold text-white">Explore</h3>
                <div className="mt-4 flex flex-col gap-3 text-zinc-400">
                  <Link href="/" className="transition hover:text-white">
                    Início
                  </Link>
                  <a href="#sobre" className="transition hover:text-white">
                    Sobre
                  </a>
                  <a
                    href="#como-funciona"
                    className="transition hover:text-white"
                  >
                    Como funciona
                  </a>
                  <a href="#servicos" className="transition hover:text-white">
                    Serviços
                  </a>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white">Acessos</h3>
                <div className="mt-4 flex flex-col gap-3 text-zinc-400">
                  <Link href="/login" className="transition hover:text-white">
                    Entrar
                  </Link>
                  <Link href="/cadastro" className="transition hover:text-white">
                    Criar conta
                  </Link>
                  <Link href="/cadastro" className="transition hover:text-white">
                    Seja cliente
                  </Link>
                  <Link
                    href="/cadastro-profissional"
                    className="transition hover:text-white"
                  >
                    Seja profissional
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white">Institucional</h3>
                <div className="mt-4 flex flex-col gap-3 text-zinc-400">
                  <Link
                    href="/privacidade"
                    className="transition hover:text-white"
                  >
                    Política de privacidade
                  </Link>
                  <Link href="/termos" className="transition hover:text-white">
                    Termos de uso
                  </Link>
                  <Link href="/termos" className="transition hover:text-white">
                    Termos do cliente
                  </Link>
                  <Link
                    href="/termos-profissional"
                    className="transition hover:text-white"
                  >
                    Termos profissionais
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/[0.07] pt-5">
            <p className="text-xs leading-5 text-zinc-600">
              © {new Date().getFullYear()} VemGO. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
