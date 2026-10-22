import Link from "next/link";
import Card from "@/components/ui/Card";

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← Voltar para o início
        </Link>

        <header className="mt-8">
          <div className="inline-flex rounded-full border border-[#00a86b]/30 bg-[#00a86b]/10 px-3 py-1 text-xs font-medium text-[#00a86b]">
            VemGO
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Termos de Uso
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Última atualização: outubro de 2026
          </p>
        </header>

        <div className="mt-8 space-y-5">
          <Card>
            <h2 className="text-xl font-semibold">1. Sobre a VemGO</h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO é uma plataforma destinada a facilitar a conexão entre
              clientes que precisam de serviços e profissionais cadastrados
              para realizar esses serviços.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A plataforma disponibiliza recursos para cadastro, busca,
              solicitação de serviços, comunicação, agendamento,
              acompanhamento e avaliação das experiências realizadas.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              2. Cadastro e responsabilidade do usuário
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              O usuário deve fornecer informações verdadeiras, completas e
              atualizadas durante o cadastro e sempre que solicitado pela
              plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Cada usuário é responsável pela utilização de sua conta, pela
              proteção de suas credenciais de acesso e pelas informações
              fornecidas à VemGO.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              3. Cadastro de profissionais
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              O profissional deverá fornecer os dados necessários para sua
              identificação, qualificação e análise cadastral.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO poderá realizar processos de validação de identidade,
              análise documental e outras verificações necessárias para a
              utilização dos recursos destinados aos profissionais.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              O cadastro ou envio de documentos não garante aprovação,
              habilitação ou disponibilidade imediata na plataforma.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              4. Serviços e preços
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Os serviços disponibilizados na plataforma são cadastrados e
              organizados pela VemGO.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Quando aplicável, a VemGO poderá apresentar referências de
              preços ou faixas de valores para auxiliar o profissional na
              definição de seus preços.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              O preço apresentado ao cliente deverá corresponder às
              informações disponíveis no momento da contratação.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              5. Solicitações e agendamentos
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              O cliente poderá utilizar a plataforma para solicitar serviços
              e, quando disponível, selecionar profissionais e horários para
              atendimento.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Após a confirmação de uma contratação ou agendamento, as partes
              deverão respeitar as condições apresentadas pela plataforma.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              6. Conduta dos usuários
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              É proibida a utilização da VemGO para atividades ilícitas,
              fraudulentas, abusivas ou que possam prejudicar outros usuários,
              profissionais ou a própria plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO poderá adotar medidas administrativas, incluindo
              restrição ou suspensão de contas, quando identificar
              descumprimento destes Termos ou comportamento incompatível com a
              utilização adequada da plataforma.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              7. Avaliações e conteúdo
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Os usuários poderão realizar avaliações e inserir comentários
              relacionados às experiências realizadas através da plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              O conteúdo enviado deverá ser verdadeiro, respeitoso e
              relacionado ao serviço realizado. Conteúdos ofensivos,
              fraudulentos ou ilícitos poderão ser removidos.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              8. Disponibilidade da plataforma
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO buscará manter seus serviços disponíveis e funcionando
              adequadamente, mas poderão ocorrer indisponibilidades
              decorrentes de manutenção, atualizações, falhas técnicas ou
              fatores externos.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              9. Alterações destes Termos
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Estes Termos poderão ser atualizados para refletir alterações na
              plataforma, nos serviços oferecidos ou nas exigências legais
              aplicáveis.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A versão vigente estará disponível nesta página.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              10. Privacidade
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              O tratamento de dados pessoais realizado pela VemGO está
              descrito em sua Política de Privacidade.
            </p>

            <Link
              href="/privacidade"
              className="mt-4 inline-block text-sm font-medium text-[#00a86b] transition hover:text-[#00c47d]"
            >
              Consultar Política de Privacidade →
            </Link>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              11. Aceitação
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Ao utilizar a VemGO, o usuário declara que leu, compreendeu e
              concorda com estes Termos de Uso e com as regras aplicáveis à
              utilização da plataforma.
            </p>
          </Card>
        </div>

        <footer className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-zinc-600">
          VemGO · Serviço rápido. Preço certo. Chama que vem!
        </footer>
      </div>
    </main>
  );
}