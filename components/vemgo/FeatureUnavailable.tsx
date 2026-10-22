import Link from "next/link";
import { notFound } from "next/navigation";

import Card from "@/components/ui/Card";

const featureCopy = {
  client: {
    favoritos: {
      title: "Favoritos",
      description:
        "A lista de serviços favoritos ainda não está disponível nesta versão local. Nenhum serviço foi salvo ou alterado.",
    },
    ajuda: {
      title: "Central de ajuda",
      description:
        "Nenhum canal de atendimento está configurado nesta versão local. Esta tela não envia solicitações nem mensagens.",
    },
    "vemgo-pay": {
      title: "VemGO Pay",
      description:
        "A integração de pagamentos e carteira não está disponível nesta versão local. Não há saldo ou movimentações financeiras para consultar.",
    },
    "clube-vemgo": {
      title: "Clube VemGO+",
      description:
        "Esta área ainda é apenas informativa. Não há benefícios, adesão ou condições comerciais ativos nesta versão local.",
    },
  },
  professional: {
    ajuda: {
      title: "Ajuda e suporte",
      description:
        "Nenhum canal de atendimento está configurado nesta versão local. Esta tela não envia solicitações nem mensagens.",
    },
    "vemgo-pay": {
      title: "VemGO Pay",
      description:
        "A integração de recebimentos não está disponível nesta versão local. Não há saldo, repasses ou movimentações financeiras para consultar.",
    },
    planos: {
      title: "Planos VemGO",
      description:
        "Os cartões exibidos no painel são apenas uma apresentação visual. Não há plano habilitado para contratação nem condições comerciais confirmadas nesta versão local.",
    },
  },
} as const;

type PortalRole = keyof typeof featureCopy;

export function FeatureUnavailable({
  role,
  feature,
}: {
  role: PortalRole;
  feature: string;
}) {
  const content = featureCopy[role][
    feature as keyof (typeof featureCopy)[typeof role]
  ];

  if (!content) {
    notFound();
  }

  const isClient = role === "client";
  const homeHref = isClient ? "/cliente" : "/profissional";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#090b0c] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p
          className={`text-xs font-bold uppercase tracking-[0.2em] ${
            isClient ? "text-emerald-400" : "text-orange-400"
          }`}
        >
          {isClient ? "Área do cliente" : "Área profissional"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {content.title}
        </h1>
        <Card
          tone={isClient ? "client" : "professional"}
          padding="lg"
          className="mt-6"
        >
          <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            {content.description}
          </p>
          <Link
            href={homeHref}
            className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
              isClient
                ? "bg-emerald-400 text-black hover:bg-emerald-300 focus-visible:ring-emerald-400"
                : "bg-orange-400 text-black hover:bg-orange-300 focus-visible:ring-orange-400"
            }`}
          >
            Voltar para minha área
          </Link>
        </Card>
      </div>
    </main>
  );
}
