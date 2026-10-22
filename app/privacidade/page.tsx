import Link from "next/link";
import Card from "@/components/ui/Card";

export default function PrivacidadePage() {
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
            Política de Privacidade
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Última atualização: outubro de 2026
          </p>
        </header>

        <div className="mt-8 space-y-5">
          <Card>
            <h2 className="text-xl font-semibold">1. Compromisso com a privacidade</h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO valoriza a privacidade e a segurança das informações
              utilizadas em sua plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Esta Política explica, de forma geral, quais dados podem ser
              coletados, para quais finalidades podem ser utilizados e quais
              medidas são adotadas para sua proteção.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              2. Dados que podem ser coletados
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Dependendo da utilização da plataforma, a VemGO poderá tratar
              informações como:
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-400">
              <li>nome e informações de cadastro;</li>
              <li>telefone e endereço de e-mail;</li>
              <li>endereços utilizados para realização dos serviços;</li>
              <li>informações relacionadas aos serviços solicitados;</li>
              <li>dados de profissionais e suas áreas de atendimento;</li>
              <li>informações necessárias para verificação de identidade;</li>
              <li>dados relacionados a pagamentos e transações;</li>
              <li>avaliações e comentários enviados pelos usuários;</li>
              <li>
                informações técnicas necessárias para funcionamento e
                segurança da plataforma.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              3. Finalidades do tratamento
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Os dados poderão ser utilizados para finalidades relacionadas
              ao funcionamento da VemGO, incluindo:
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-400">
              <li>criação e gerenciamento de contas;</li>
              <li>identificação dos usuários;</li>
              <li>processos de verificação de identidade;</li>
              <li>conexão entre clientes e profissionais;</li>
              <li>solicitação e execução de serviços;</li>
              <li>agendamentos e comunicação relacionada aos serviços;</li>
              <li>processamento e registro de pagamentos;</li>
              <li>prevenção de fraudes e abusos;</li>
              <li>segurança da plataforma;</li>
              <li>atendimento e suporte;</li>
              <li>cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              4. Verificação de identidade
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Alguns profissionais poderão ser submetidos a processos de
              identificação e validação documental antes de utilizar
              determinadas funcionalidades da plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Esses processos poderão envolver documentos de identificação,
              imagens e informações necessárias para confirmar a identidade
              informada pelo usuário.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              5. Compartilhamento de dados
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Os dados poderão ser compartilhados quando necessário para a
              execução dos serviços da VemGO, cumprimento de obrigações
              legais, prevenção de fraudes, processamento de pagamentos,
              verificação de identidade ou utilização de serviços tecnológicos
              necessários ao funcionamento da plataforma.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO busca limitar o compartilhamento às informações
              necessárias para cada finalidade.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              6. Segurança das informações
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A VemGO adota medidas técnicas e organizacionais destinadas a
              proteger os dados contra acessos não autorizados, perda,
              alteração, divulgação ou destruição indevida.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Ainda assim, nenhum sistema conectado à internet pode ser
              considerado absolutamente seguro.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              7. Retenção das informações
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              As informações poderão ser mantidas pelo período necessário para
              cumprir as finalidades para as quais foram coletadas, atender
              obrigações legais, preservar direitos e manter registros
              necessários à operação da plataforma.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              8. Direitos dos titulares
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Nos termos da legislação aplicável, especialmente da Lei Geral
              de Proteção de Dados Pessoais (LGPD), o titular poderá exercer
              direitos relacionados aos seus dados pessoais, observadas as
              hipóteses e limitações previstas em lei.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              Entre esses direitos podem estar confirmação da existência de
              tratamento, acesso, correção, atualização e outras solicitações
              previstas na legislação aplicável.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              9. Cookies e tecnologias semelhantes
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A plataforma poderá utilizar cookies, armazenamento local e
              tecnologias semelhantes para manter sessões, melhorar a
              experiência do usuário, garantir segurança e compreender o
              funcionamento dos recursos disponibilizados.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              10. Alterações desta Política
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Esta Política poderá ser atualizada sempre que necessário para
              refletir mudanças na plataforma, nos processos de tratamento de
              dados ou na legislação aplicável.
            </p>

            <p className="mt-3 leading-7 text-zinc-400">
              A versão vigente estará disponível nesta página.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              11. Termos de Uso
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              A utilização da VemGO também está sujeita aos seus Termos de
              Uso.
            </p>

            <Link
              href="/termos"
              className="mt-4 inline-block text-sm font-medium text-[#00a86b] transition hover:text-[#00c47d]"
            >
              Consultar Termos de Uso →
            </Link>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">
              12. Contato
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Para dúvidas ou solicitações relacionadas à privacidade e ao
              tratamento de dados pessoais, o usuário deverá utilizar os
              canais oficiais de atendimento disponibilizados pela VemGO.
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