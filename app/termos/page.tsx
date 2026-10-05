import Image from "next/image";
import Link from "next/link";

export default function TermosPage() {
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
            Termos de Uso
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
              1. Sobre os Termos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Estes Termos de Uso regulam o acesso e a utilização da plataforma
              VemGO, incluindo seu aplicativo, site e demais recursos
              disponibilizados aos usuários.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Ao criar uma conta, utilizar a plataforma ou contratar um
              serviço, o usuário declara que leu e concorda com estes Termos de
              Uso e com a Política de Privacidade da VemGO.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              2. O que é a VemGO
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO é uma plataforma tecnológica destinada a conectar
              clientes a profissionais e empresas que oferecem serviços,
              facilitando a identificação da necessidade, busca, contratação,
              agendamento, acompanhamento e avaliação dos serviços.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A execução do serviço é realizada pelo profissional ou empresa
              contratado, conforme as condições apresentadas na plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              3. Cadastro e Conta
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Para utilizar determinadas funcionalidades, o usuário deverá
              realizar cadastro e fornecer informações verdadeiras, completas e
              atualizadas.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A conta é pessoal e o usuário é responsável pela proteção de suas
              credenciais de acesso. Caso identifique acesso não autorizado ou
              atividade suspeita, deverá comunicar a VemGO pelos canais
              disponíveis.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá solicitar informações adicionais para segurança,
              prevenção a fraudes, validação de identidade ou cumprimento de
              obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              4. Solicitação e Contratação de Serviços
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O cliente poderá informar sua necessidade ou selecionar um
              serviço disponível na plataforma. A VemGO poderá utilizar regras
              automatizadas e, futuramente, inteligência artificial para
              identificar o serviço mais adequado.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando houver profissionais disponíveis, a plataforma poderá
              apresentar opções compatíveis com o serviço solicitado, região,
              disponibilidade e demais critérios operacionais.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A contratação será considerada confirmada somente após a
              confirmação apresentada pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Preços e Pagamentos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O preço aplicável ao serviço será apresentado ao cliente antes da
              confirmação da contratação, juntamente com eventuais taxas,
              descontos ou condições adicionais aplicáveis.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Os pagamentos deverão ser realizados pelos meios disponibilizados
              oficialmente pela VemGO, quando essa funcionalidade estiver
              disponível.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A confirmação do pagamento poderá depender da autorização do
              respectivo meio ou provedor de pagamento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              6. Agendamento e Execução
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Quando o serviço exigir agendamento, a data e o horário serão
              definidos conforme a disponibilidade apresentada pela plataforma
              e a confirmação do profissional.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O profissional deverá executar o serviço de acordo com as
              condições contratadas e dentro de sua área de atuação e
              competência.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Materiais, peças ou serviços adicionais somente serão cobrados
              quando previamente informados e aceitos pelo cliente, quando
              aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Cancelamentos e Reembolsos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O cliente poderá cancelar uma solicitação ou contratação pelos
              meios disponibilizados pela VemGO, observadas as condições
              apresentadas no momento da contratação e a legislação aplicável.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando aplicável, serão respeitados os direitos previstos no
              Código de Defesa do Consumidor, inclusive o direito de
              arrependimento nas hipóteses legalmente previstas.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Eventuais reembolsos serão processados conforme a forma de
              pagamento utilizada e os prazos do respectivo meio de pagamento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              8. Responsabilidades do Usuário
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O usuário deverá utilizar a VemGO de forma lícita, respeitosa e
              compatível com estes Termos.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Não é permitido utilizar a plataforma para fraude, falsificação
              de informações, manipulação de avaliações, tentativa de obter
              benefícios indevidos, ameaças, assédio, discriminação ou qualquer
              atividade ilícita.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O usuário também deverá fornecer informações necessárias para a
              correta execução do serviço e respeitar as orientações de
              segurança apresentadas pela plataforma ou pelo profissional.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              9. Profissionais e Avaliações
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá realizar processos de cadastro, validação e
              verificação de profissionais conforme os critérios aplicáveis a
              cada categoria.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A existência de verificações ou avaliações não representa garantia
              absoluta sobre a execução ou sobre a conduta de determinado
              profissional.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              As avaliações realizadas pelos usuários deverão refletir
              experiências reais e não poderão conter conteúdo ofensivo,
              discriminatório, ameaçador, fraudulento ou ilegal.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              10. Segurança e Prevenção a Fraudes
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá utilizar mecanismos técnicos e operacionais para
              proteger contas, pagamentos, informações e operações contra
              acessos indevidos, abusos e fraudes.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A plataforma poderá suspender ou restringir temporariamente uma
              conta ou operação quando houver indícios de fraude, risco de
              segurança, violação destes Termos ou obrigação legal.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Em situações de emergência ou risco imediato, o usuário deverá
              procurar os serviços públicos competentes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              11. Proteção de Dados e Privacidade
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá tratar dados pessoais necessários para criação e
              administração da conta, funcionamento da plataforma,
              identificação de serviços, agendamentos, pagamentos, atendimento,
              segurança e demais finalidades legítimas relacionadas à operação.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O tratamento de dados pessoais observará a legislação aplicável,
              especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD).
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Informações detalhadas sobre coleta, utilização, compartilhamento,
              armazenamento e direitos dos titulares estão disponíveis na
              <Link
                href="/privacidade"
                className="ml-1 font-semibold text-[#00c853] hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              12. Inteligência Artificial e Automação
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A VemGO poderá utilizar sistemas automatizados e inteligência
              artificial para apoiar a identificação de necessidades,
              classificação de serviços, matching entre clientes e
              profissionais, atendimento, segurança e melhoria da plataforma.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando uma funcionalidade utilizar automação relevante para uma
              decisão sobre o usuário, serão observados os direitos previstos
              na legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              13. Propriedade Intelectual
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              A marca VemGO, software, identidade visual, textos, elementos
              gráficos, sistemas, códigos e demais conteúdos da plataforma são
              protegidos pela legislação aplicável.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O uso da plataforma não transfere ao usuário qualquer direito de
              propriedade sobre esses elementos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              14. Suspensão e Encerramento da Conta
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              O usuário poderá solicitar o encerramento de sua conta pelos
              canais disponibilizados pela VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá suspender ou encerrar uma conta quando houver
              violação destes Termos, fraude, risco de segurança, obrigação
              legal ou outra situação legítima que justifique a medida.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              O encerramento da conta não elimina obrigações já constituídas
              nem impede a conservação de informações quando necessária para
              cumprimento de obrigação legal ou exercício regular de direitos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              15. Alterações dos Termos
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Estes Termos poderão ser atualizados para refletir mudanças na
              plataforma, nos serviços, na legislação ou na operação da VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A versão vigente ficará disponível na plataforma com indicação da
              respectiva data de atualização.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Quando uma alteração exigir novo aceite, a VemGO poderá solicitar
              nova manifestação do usuário antes da utilização das
              funcionalidades afetadas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              16. Atendimento
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Dúvidas, solicitações, reclamações e demais questões relacionadas
              à utilização da plataforma poderão ser encaminhadas pelos canais
              oficiais de atendimento disponibilizados pela VemGO.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              As solicitações poderão exigir confirmação da identidade do
              usuário para proteção de sua conta e de seus dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              17. Disposições Gerais
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Estes Termos não têm como objetivo afastar direitos assegurados
              ao consumidor pela legislação brasileira.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Caso alguma disposição destes Termos seja considerada inválida ou
              inaplicável, as demais disposições permanecerão válidas na medida
              permitida pela legislação.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              Eventuais documentos específicos apresentados durante uma
              contratação poderão complementar estes Termos em relação àquela
              contratação.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              18. Aceite Final
            </h2>

            <p className="text-justify [text-indent:1.5rem]">
              Ao marcar a opção de aceite durante o cadastro ou selecionar um
              comando equivalente a “Criar conta”, “Aceito os Termos”,
              “Contratar” ou “Confirmar”, o usuário declara que teve acesso a
              estes Termos e concorda com as condições aqui estabelecidas.
            </p>

            <p className="mt-3 text-justify [text-indent:1.5rem]">
              A VemGO poderá registrar a versão dos Termos aceita, a data e o
              horário do aceite e outras informações técnicas necessárias para
              comprovação da manifestação do usuário.
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