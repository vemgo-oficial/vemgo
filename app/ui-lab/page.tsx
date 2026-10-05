import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";

export default function UiLabPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-text-primary">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="mb-3 inline-flex rounded-full border border-vemgo-green-border bg-vemgo-green-soft px-3 py-1 text-xs font-medium text-vemgo-green">
            VEMGO DESIGN SYSTEM
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            UI Lab
          </h1>

          <p className="mt-2 max-w-2xl text-text-secondary">
            Ambiente interno para validar os componentes visuais da
            plataforma VemGO antes de utilizá-los nas telas reais.
          </p>
        </header>

        <div className="grid gap-6">
          {/* BUTTONS */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Buttons
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Ações principais e contextuais da plataforma.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button>
                Cliente
              </Button>

              <Button variant="professional">
                Profissional
              </Button>

              <Button variant="control">
                Controle
              </Button>

              <Button variant="secondary">
                Secundário
              </Button>

              <Button variant="ghost">
                Ghost
              </Button>

              <Button variant="danger">
                Excluir
              </Button>

              <Button loading>
                Salvando
              </Button>
            </div>
          </Card>

          {/* INPUTS */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Inputs
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Campos de formulário padronizados.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Nome completo"
                placeholder="Digite seu nome"
                hint="Como aparece no seu perfil VemGO."
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="voce@email.com"
              />

              <Input
                label="Campo com erro"
                placeholder="Digite alguma coisa"
                error="Este campo precisa ser preenchido."
              />

              <Input
                label="Campo desabilitado"
                placeholder="Indisponível"
                disabled
              />
            </div>
          </Card>

          {/* BADGES */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Status & Badges
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Estados visuais sem depender exclusivamente de cor.
            </p>

            <div className="flex flex-wrap gap-3">
              <Badge>Neutro</Badge>

              <Badge variant="success">
                Ativo
              </Badge>

              <Badge variant="warning">
                Em análise
              </Badge>

              <Badge variant="danger">
                Bloqueado
              </Badge>

              <Badge variant="green">
                Cliente
              </Badge>

              <Badge variant="orange">
                Profissional
              </Badge>

              <Badge variant="blue">
                Controle
              </Badge>
            </div>
          </Card>

          {/* PROGRESS */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Progress
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Base para onboarding, processos e indicadores.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <Progress
                value={35}
                label="Cliente"
                showValue
                variant="green"
              />

              <Progress
                value={65}
                label="Profissional"
                showValue
                variant="orange"
              />

              <Progress
                value={85}
                label="Controle"
                showValue
                variant="blue"
              />
            </div>
          </Card>

          {/* LOADING */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Loading
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Estados de carregamento.
            </p>

            <div className="flex items-center gap-6">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </Card>

          {/* COMPOSITION */}
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Component Composition
            </h2>

            <p className="mb-6 text-sm text-text-tertiary">
              Como os componentes começam a formar experiências
              reais da VemGO.
            </p>

            <div className="max-w-xl rounded-xl border border-white/10 bg-surface-2 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <Badge variant="green">
                    Cliente
                  </Badge>

                  <h3 className="mt-3 text-lg font-semibold">
                    O que você precisa resolver?
                  </h3>

                  <p className="mt-1 text-sm text-text-secondary">
                    Descreva sua necessidade e a VemGO encontrará
                    o serviço adequado.
                  </p>
                </div>

                <Badge variant="success">
                  Online
                </Badge>
              </div>

              <Input
                placeholder="Ex.: preciso instalar uma tomada..."
              />

              <div className="mt-4 flex justify-end">
                <Button>
                  Continuar
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-text-tertiary">
          VemGO Design System · Internal UI Lab
        </footer>
      </div>
    </main>
  );
}