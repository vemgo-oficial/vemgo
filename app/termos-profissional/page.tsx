import Image from "next/image";
import Link from "next/link";

export default function TermosProfissionalPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-zinc-800 px-6 py-8 text-center sm:px-8">
          <div className="flex justify-center">
            <Image
              src="/logo-vemgo-transparente.png"
              alt="VemGO"
              width={1751}
              height={465}
              className="h-16 w-auto object-contain"
            />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Termos para Profissionais
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            VemGO — Serviço rápido. Preço certo. Chama que vem!
          </p>

          <p className="mt-2 text-xs text-zinc-500">
            Última atualização: outubro de 2026
          </p>
        </header>

        <div className="space-y-10 px-6 py-10 text-[15px] leading-7 text-zinc-300 sm:px-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              1. Sobre estes Termos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Estes Termos para Profissionais complementam os Termos de Uso da
              VemGO e estabelecem as condições aplicáveis ao cadastro,
              participação e prestação de serviços por profissionais na
              plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Ao realizar o cadastro profissional e utilizar os recursos
              destinados aos profissionais, o usuário declara que leu e
              concorda com estes Termos, com os Termos de Uso e com a Política
              de Privacidade da VemGO.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              2. Cadastro profissional
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional deverá fornecer informações verdadeiras, completas
              e atualizadas durante o cadastro, incluindo seus dados pessoais,
              informações de identificação, endereço, competências, serviços,
              preços, disponibilidade e área de atendimento.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá solicitar informações ou documentos adicionais
              para validação de identidade, segurança, prevenção a fraudes ou
              análise cadastral.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              3. Verificação e aprovação
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O cadastro profissional poderá estar sujeito a processos de
              verificação de identidade e análise de segurança antes da
              disponibilização integral dos recursos da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O envio de informações ou documentos não garante aprovação ou
              disponibilidade imediata do perfil profissional.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              4. Serviços e competências
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional deverá selecionar somente serviços e competências
              que esteja efetivamente habilitado e preparado para executar.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O profissional é responsável pela qualidade, segurança,
              regularidade e execução dos serviços que aceitar realizar,
              observadas as condições apresentadas na plataforma e a legislação
              aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Preços
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional define os preços dos serviços que oferece na
              plataforma, observadas as funcionalidades e regras comerciais
              disponibilizadas pela VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá disponibilizar faixas ou referências de preço para
              determinados serviços. Essas referências não substituem o preço
              definido pelo profissional.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O profissional deverá manter seus preços atualizados e respeitar
              o valor apresentado ao cliente no momento da contratação.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              6. Disponibilidade e área de atendimento
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional deverá manter atualizadas sua disponibilidade e
              sua área de atendimento para que a plataforma possa apresentar
              oportunidades compatíveis.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O cadastro de disponibilidade ou região não garante o recebimento
              de oportunidades.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Oportunidades e contratação
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá encaminhar ao profissional oportunidades
              compatíveis com os serviços cadastrados, região, disponibilidade
              e demais critérios operacionais da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O profissional poderá aceitar ou recusar oportunidades conforme
              os recursos disponibilizados pela plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Após a aceitação e confirmação da contratação, o profissional
              deverá cumprir as condições apresentadas na plataforma e o
              agendamento confirmado.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              8. Conduta profissional
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional deverá agir de forma ética, respeitosa e
              profissional no relacionamento com clientes e com a VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              É proibida a utilização da plataforma para informações falsas,
              fraude, manipulação de avaliações, tentativa de burlar as regras
              da plataforma ou qualquer outra utilização incompatível com sua
              finalidade.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              9. Cancelamentos e indisponibilidade
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O profissional deverá manter sua disponibilidade atualizada e
              comunicar eventuais impedimentos pelos recursos disponibilizados
              pela VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Cancelamentos, faltas ou outras ocorrências poderão ser
              registrados na plataforma e considerados nos processos
              operacionais e de segurança da VemGO.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              10. Dados e privacidade
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O tratamento dos dados pessoais do profissional será realizado
              conforme a Política de Privacidade da VemGO e as finalidades
              informadas pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              11. Alterações e encerramento
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá atualizar estes Termos para acompanhar alterações
              na plataforma, nos serviços ou em suas condições operacionais.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O acesso ou a permanência do profissional na plataforma poderá
              ser suspenso ou encerrado em situações previstas nos Termos de
              Uso, em caso de violação das regras ou quando necessário para
              segurança e funcionamento da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              12. Documentos relacionados
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/termos"
                className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-white transition hover:border-orange-500 hover:text-orange-400"
              >
                Termos de Uso
              </Link>

              <Link
                href="/privacidade"
                className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-white transition hover:border-orange-500 hover:text-orange-400"
              >
                Política de Privacidade
              </Link>
            </div>
          </section>
        </div>

        <footer className="border-t border-zinc-800 px-6 py-8 text-center text-xs text-zinc-600 sm:px-8">
          VemGO — Serviço rápido. Preço certo. Chama que vem!
        </footer>
      </div>
    </main>
  );
}