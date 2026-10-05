import Image from "next/image";
import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-zinc-800 px-6 py-8 text-center sm:px-8">
          <div className="flex justify-center">
            <Image
              src="/logo-vemgo.png"
              alt="VemGO"
              width={220}
              height={80}
              className="h-16 w-auto object-contain"
            />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Política de Privacidade
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
              1. Sobre esta Política
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Esta Política de Privacidade explica como a VemGO poderá tratar
              dados pessoais relacionados à utilização de sua plataforma,
              aplicativos, páginas, sistemas e demais recursos disponibilizados
              aos usuários.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Nosso objetivo é apresentar de forma clara quais informações
              poderão ser tratadas, para quais finalidades, como poderão ser
              utilizadas e quais direitos podem ser exercidos pelos titulares
              de dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              2. Quais dados podemos tratar
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Dependendo da forma como você utiliza a VemGO, poderemos tratar
              diferentes categorias de dados pessoais necessários para o
              funcionamento da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Entre eles podem estar dados de identificação, como nome, dados
              de contato, e-mail, telefone e informações cadastrais.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Também poderão ser tratados dados relacionados a endereços,
              localização, solicitações de serviços, histórico de utilização,
              avaliações, comunicações, documentos e informações necessárias
              para determinados processos de verificação.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Para profissionais, poderão ser tratados dados relacionados a
              documentos, competências, serviços oferecidos, regiões de
              atendimento, disponibilidade, verificações e informações
              operacionais necessárias à utilização da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              3. Como utilizamos os dados
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Os dados pessoais poderão ser utilizados para criar e administrar
              contas, autenticar usuários, disponibilizar funcionalidades,
              identificar necessidades, apresentar serviços, conectar clientes
              e profissionais e acompanhar solicitações.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Também poderão ser utilizados para realizar agendamentos,
              processar pagamentos, enviar notificações, prestar atendimento,
              registrar avaliações, manter históricos e melhorar a experiência
              de utilização da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Poderemos ainda utilizar informações para segurança, prevenção a
              fraudes, investigação de abusos, manutenção de registros,
              cumprimento de obrigações legais e exercício regular de direitos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              4. Localização e endereços
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá tratar informações relacionadas a endereços
              cadastrados pelo usuário e, quando disponibilizado e autorizado,
              informações de localização necessárias para determinadas
              funcionalidades.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Essas informações poderão ser utilizadas, por exemplo, para
              identificar regiões de atendimento, apresentar profissionais
              compatíveis, calcular distâncias, organizar deslocamentos e
              permitir a execução de serviços solicitados.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O tratamento de informações de localização será realizado de
              acordo com a finalidade da funcionalidade disponibilizada e com
              as permissões aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Dados de profissionais
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Para permitir a atuação de profissionais na plataforma, a VemGO
              poderá solicitar informações cadastrais, profissionais e
              documentais necessárias à identificação, verificação e operação
              do profissional.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Dependendo do serviço e do processo de cadastro, poderão ser
              solicitados documentos de identidade, informações profissionais,
              competências, serviços, regiões de atendimento e outros dados
              necessários para os procedimentos de segurança e verificação.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O acesso a determinados documentos poderá ser restrito a
              funcionalidades e pessoas autorizadas, conforme a finalidade e
              os controles de segurança aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              6. Compartilhamento de dados
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá compartilhar dados pessoais quando isso for
              necessário para disponibilizar funcionalidades, executar uma
              solicitação, processar pagamentos, prestar atendimento, realizar
              verificações ou utilizar serviços de fornecedores e parceiros
              envolvidos na operação da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Por exemplo, determinadas informações poderão ser disponibilizadas
              a profissionais quando necessárias para a execução de um serviço
              solicitado pelo cliente.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Também poderão existir compartilhamentos com fornecedores de
              tecnologia, hospedagem, autenticação, mapas, comunicação,
              pagamentos, segurança e outros serviços necessários ao
              funcionamento da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO não pretende compartilhar dados pessoais de forma
              incompatível com as finalidades informadas nesta Política, salvo
              quando houver outra base legal aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Pagamentos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Quando pagamentos estiverem disponíveis na plataforma, operações
              financeiras poderão ser processadas por provedores especializados
              de pagamento.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá tratar informações necessárias para identificar a
              operação, acompanhar seu status, realizar conciliação, suporte,
              prevenção a fraudes, estornos, reembolsos e manutenção do
              histórico financeiro.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Informações completas de instrumentos de pagamento poderão ser
              tratadas diretamente pelos respectivos provedores, de acordo com
              suas próprias políticas e procedimentos de segurança.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              8. Segurança
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO adotará medidas técnicas e organizacionais compatíveis
              com sua operação para proteger dados pessoais contra acessos não
              autorizados, perda, alteração, divulgação ou outras formas
              inadequadas de tratamento.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Essas medidas poderão incluir controles de acesso, autenticação,
              segregação de permissões, registros de auditoria, proteção de
              infraestrutura, armazenamento seguro e mecanismos de prevenção a
              abusos e fraudes.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Nenhum sistema eletrônico pode ser considerado absolutamente
              seguro. Por isso, também é importante que o usuário mantenha suas
              credenciais protegidas e comunique situações suspeitas pelos
              canais disponibilizados pela VemGO.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              9. Retenção e exclusão
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Os dados pessoais poderão ser mantidos pelo período necessário
              para cumprir as finalidades para as quais foram coletados,
              atender obrigações legais ou regulatórias, preservar registros
              necessários e exercer ou defender direitos.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando não houver necessidade legítima de manutenção dos dados,
              eles poderão ser excluídos, anonimizados ou submetidos a outras
              medidas adequadas, observadas as hipóteses legais de conservação.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A exclusão de uma conta não significa necessariamente a eliminação
              imediata de todos os registros relacionados à operação, quando
              sua conservação for necessária para cumprimento de obrigação
              legal ou outra finalidade legítima prevista na legislação.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              10. Direitos do titular
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Nos termos da legislação aplicável, o titular poderá exercer
              direitos relacionados aos seus dados pessoais, conforme as
              condições e limitações previstas em lei.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Entre esses direitos podem estar a confirmação da existência de
              tratamento, acesso aos dados, correção de informações
              incompletas, inexatas ou desatualizadas, anonimização, bloqueio
              ou eliminação de dados em determinadas situações, portabilidade,
              informações sobre compartilhamentos e revisão de determinadas
              decisões automatizadas, quando aplicável.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O titular também poderá solicitar informações sobre as
              consequências de eventual recusa ao fornecimento de dados, quando
              aplicável, e exercer direitos relacionados ao consentimento,
              inclusive sua revogação, quando essa for a base legal utilizada.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Algumas solicitações poderão estar sujeitas a limitações legais,
              operacionais ou técnicas e poderão exigir confirmação da
              identidade do solicitante para proteção contra acessos indevidos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              11. Cookies e tecnologias semelhantes
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá utilizar cookies, armazenamento local e tecnologias
              semelhantes para funcionamento da plataforma, autenticação,
              segurança, preferências, análise de utilização e melhoria dos
              serviços.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Dependendo da tecnologia utilizada, o usuário poderá controlar ou
              restringir determinadas tecnologias por meio das configurações do
              navegador ou do dispositivo, observando que algumas
              funcionalidades poderão deixar de funcionar corretamente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              12. Comunicações e marketing
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá enviar comunicações relacionadas à conta,
              solicitações, agendamentos, serviços, segurança, suporte e outras
              informações necessárias ao funcionamento da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Comunicações de marketing poderão observar as permissões,
              preferências e bases legais aplicáveis, podendo existir
              mecanismos para gerenciamento ou cancelamento desse tipo de
              comunicação quando apropriado.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O cancelamento de comunicações promocionais não impede o envio de
              mensagens necessárias para a operação da conta ou dos serviços
              utilizados.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              13. Alterações desta Política
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Esta Política poderá ser atualizada periodicamente para refletir
              alterações na plataforma, nas operações realizadas, nas
              tecnologias utilizadas ou nas exigências aplicáveis.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A versão vigente será disponibilizada na plataforma acompanhada
              da respectiva data de atualização.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando uma alteração exigir comunicação específica ou nova
              manifestação do usuário, a VemGO poderá adotar os procedimentos
              apropriados para essa finalidade.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              14. Contato
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Para dúvidas, solicitações relacionadas a dados pessoais ou
              exercício de direitos, o usuário poderá utilizar os canais de
              atendimento disponibilizados pela VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              As solicitações poderão ser analisadas de acordo com a legislação
              aplicável e com os procedimentos de segurança necessários para
              confirmar a identidade do solicitante.
            </p>
          </section>

          <div className="border-t border-zinc-800 pt-8 text-center">
            <Link
              href="/cadastro"
              className="font-bold text-[#00c853] hover:underline"
            >
              ← Voltar para o cadastro
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}