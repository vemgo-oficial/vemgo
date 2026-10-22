"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Progress from "@/components/ui/Progress";
import Spinner from "@/components/ui/Spinner";

export default function UiLabPage() {
  const [value, setValue] = useState("");
  const [textarea, setTextarea] = useState("");

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="inline-flex rounded-full border border-[#00a86b]/30 bg-[#00a86b]/10 px-3 py-1 text-xs font-medium text-[#00a86b]">
            VemGO UI Lab
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Biblioteca visual
          </h1>

          <p className="mt-2 max-w-2xl text-zinc-400">
            Página interna para validar os componentes visuais e manter
            consistência no design da plataforma.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <h2 className="text-xl font-semibold">
              Botões
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Estados e variações disponíveis.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary">
                Primário
              </Button>

              <Button variant="secondary">
                Secundário
              </Button>

              <Button variant="outline">
                Outline
              </Button>

              <Button variant="danger">
                Perigo
              </Button>

              <Button variant="professional">
                Profissional
              </Button>

              <Button disabled>
                Desabilitado
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Badges
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Indicadores de status.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="default">
                Padrão
              </Badge>

              <Badge variant="success">
                Sucesso
              </Badge>

              <Badge variant="warning">
                Em análise
              </Badge>

              <Badge variant="danger">
                Rejeitado
              </Badge>

              <Badge variant="info">
                Informação
              </Badge>

              <Badge variant="professional">
                Profissional
              </Badge>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Campos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Inputs e áreas de texto.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Input
                label="Nome"
                placeholder="Digite seu nome"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
              />

              <Input
                label="Campo com dica"
                placeholder="Exemplo"
                hint="Esta informação será utilizada no cadastro."
              />

              <Input
                label="Campo com erro"
                placeholder="Exemplo"
                error="Este campo contém um erro."
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Descrição"
                  placeholder="Digite uma descrição..."
                  value={textarea}
                  onChange={(event) => setTextarea(event.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Progresso
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Indicadores utilizados nos fluxos de cadastro.
            </p>

            <div className="mt-6 space-y-6">
              <Progress
                value={35}
                label="Cliente"
                variant="client"
              />

              <Progress
                value={65}
                label="Profissional"
                variant="professional"
              />

              <Progress
                value={100}
                label="Concluído"
                variant="client"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Spinners
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Indicadores de carregamento.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-8">
              <div className="text-center">
                <Spinner variant="client" />
                <p className="mt-3 text-xs text-zinc-500">
                  Cliente
                </p>
              </div>

              <div className="text-center">
                <Spinner variant="professional" />
                <p className="mt-3 text-xs text-zinc-500">
                  Profissional
                </p>
              </div>

              <div className="text-center">
                <Spinner variant="light" />
                <p className="mt-3 text-xs text-zinc-500">
                  Light
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Cards
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Exemplo de conteúdo dentro das superfícies da plataforma.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-zinc-500">
                  Solicitações
                </p>

                <p className="mt-2 text-3xl font-bold">
                  24
                </p>

                <p className="mt-2 text-sm text-[#00a86b]">
                  +12% este mês
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-zinc-500">
                  Profissionais
                </p>

                <p className="mt-2 text-3xl font-bold">
                  158
                </p>

                <p className="mt-2 text-sm text-orange-400">
                  12 aguardando análise
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-zinc-500">
                  Avaliação média
                </p>

                <p className="mt-2 text-3xl font-bold">
                  4,9
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  Excelente
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              Cores do sistema
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Paleta principal utilizada pela VemGO.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="h-20 rounded-xl border border-white/10 bg-black" />
                <p className="mt-2 text-sm font-medium">
                  Background
                </p>
                <p className="text-xs text-zinc-500">
                  #050505
                </p>
              </div>

              <div>
                <div className="h-20 rounded-xl border border-white/10 bg-[#101010]" />
                <p className="mt-2 text-sm font-medium">
                  Surface
                </p>
                <p className="text-xs text-zinc-500">
                  #101010
                </p>
              </div>

              <div>
                <div className="h-20 rounded-xl bg-[#00a86b]" />
                <p className="mt-2 text-sm font-medium">
                  VemGO Green
                </p>
                <p className="text-xs text-zinc-500">
                  #00A86B
                </p>
              </div>

              <div>
                <div className="h-20 rounded-xl bg-[#f97316]" />
                <p className="mt-2 text-sm font-medium">
                  Professional
                </p>
                <p className="text-xs text-zinc-500">
                  #F97316
                </p>
              </div>
            </div>
          </Card>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-zinc-600">
          VemGO UI Lab · Ambiente interno de desenvolvimento
        </footer>
      </div>
    </main>
  );
}