# VemGO — relatório técnico central

Atualizado em 20/10/2026. Este relatório descreve propostas e validações locais. Nenhuma migração foi aplicada ao Supabase remoto.

## Estado do repositório

O diretório já continha uma árvore amplamente modificada antes desta etapa: 50 arquivos rastreados modificados e 12 não rastreados no levantamento inicial, além do branch `main` estar um commit à frente de `origin/main`. As alterações anteriores foram preservadas. Nesta continuação não houve mudança de código; foram atualizados relatórios de esquema/catálogo, testes P0, matching/pagamentos e portais, além da tabela de reconciliação linha a linha. No estado atual, `git status --short` mostra 50 arquivos rastreados modificados e 22 entradas não rastreadas (inclui diretórios). Não houve commit, push, deploy, limpeza ou escrita remota.

## P0 preparado

Arquivo da proposta: `supabase/migrations/20261020120000_p0_authorization_hardening.sql`.

- `match_request(uuid)` agora exige usuário autenticado, titularidade da solicitação e estado classificado; só inclui profissionais aprovados, ativos e com identidade verificada.
- `select_professional_for_request(uuid, uuid)` exige titularidade, estado matching, match pendente/enviado, profissional ainda elegível e preço ativo antes de criar/confirmar o pedido.
- `get_client_request_matches(uuid)` deixa de ser executável por `PUBLIC`/`anon`; conserva `authenticated` e concede explicitamente `service_role`.
- `request_phone_verification(text)` falha de forma fechada enquanto a entrega segura por SMS/WhatsApp não estiver configurada; não retorna códigos de teste. `verify_phone_code(text)` também deixa de ser público/anônimo. As permissões anteriores relevantes de `service_role` são mantidas explicitamente.
- `sync_verified_phone()` sincroniza o telefone e o horário somente a partir de `auth.users` depois da confirmação pelo Supabase Auth. A RPC não aceita telefone fornecido pelo navegador.
- `submit_identity_for_review()` só marca a identidade como pendente se existir uma verificação pendente do próprio usuário. A aprovação continua com a RPC administrativa existente e não foi alterada.
- Em `profiles`, `professionals`, `request_matches`, `payments` e `transactions`, remove permissões amplas de escrita para papéis públicos/API e concede apenas leitura/atualização/inserção necessárias. Grants por coluna de escrita também são revogados antes das permissões estreitas.
- As três telas de perfil mantêm a opção de repetir a sincronização se o OTP foi aceito, mas a primeira sincronização falhou. O código OTP não precisa ser reutilizado nessa tentativa.

## Evidências locais e remotas consultadas

As consultas remotas anteriores foram somente de leitura e não foram repetidas nesta etapa. Elas indicaram que o esquema remoto correspondia ao snapshot de raiz, não a `supabase/schema.sql`. Esse snapshot antigo não tem quatro RPCs exigidas pela migração, quatro colunas de segurança que ela referencia e a policy `profiles_update_own`; o snapshot raiz contém esses objetos. A migração agora falha cedo se as colunas necessárias não existirem. Essa evidência histórica faz do snapshot raiz a hipótese local mais próxima do destino observado, mas não o torna fonte autoritativa: está modificado, não há cadeia-base completa e a captura de backup cobre apenas uma RPC. A reconciliação está em [RECONCILIACAO-ESQUEMA-CATALOGO.md](RECONCILIACAO-ESQUEMA-CATALOGO.md).

Nesta continuação não foi feita consulta ao Supabase remoto. Não há PostgreSQL local identificado (sem `psql`/`pg_ctl`/`pg_isready` no PATH ou listener em 5432/54321); Docker Desktop está instalado, mas `docker info` recebeu acesso negado ao named pipe `docker_engine` e não pôde ler a configuração do perfil Docker. A CLI Supabase 2.121.0 está disponível como dependência local (`node_modules/.bin/supabase.cmd`), embora não esteja no PATH; não foi executada nesta continuação. A verificação anterior da CLI foi bloqueada por gravação de telemetria fora do workspace. WSL também está instalado, mas sua enumeração foi negada com `E_ACCESSDENIED`. Não contornei esses limites. Não há staging sanitizado confirmado.

A função atual de aprovação profissional já exige administrador ativo, identidade verificada e conta ativa, além de motivo de rejeição. Ela não foi substituída nem chamada. O projeto remoto e a estrutura local apresentam diferenças; a migração verifica pré-condições e permanece não aplicada.

## Riscos e verificações pendentes

- A migração depende dos nomes, colunas, políticas e assinaturas existentes. As pré-condições verificam tabelas, RPCs, campos e tipos de retorno principais, mas a migração ainda precisa de parser SQL e execução em banco local de teste equivalente. As consultas remotas anteriores indicaram `CREATE` falso em `public` para `anon`, `authenticated` e `service_role`; outros papéis personalizados e o papel executor ainda não foram auditados nesta etapa.
- A sincronização presume que `auth.users.phone` e `phone_confirmed_at` refletem a confirmação de `phone_change` nesta configuração Supabase. Isso não foi exercitado no Auth remoto; validar em ambiente local/staging com OTP real antes de habilitar o fluxo.
- O pedido de OTP personalizado continua desabilitado até existir um canal SMS/WhatsApp seguro. As telas de verificação baseadas nessa RPC não devem prometer envio enquanto ela estiver desabilitada.
- A restrição de acesso direto a tabelas pode revelar outros fluxos de frontend que dependam de INSERT/UPDATE amplo. Após lint/build, é necessário exercitar cadastro, perfil, onboarding, matching, seleção de profissional e leitura de pagamentos/ledger com papéis reais de teste.
- As funções de matching ainda deixam uma janela de concorrência entre verificar elegibilidade e gravar o resultado; testar mudanças simultâneas de status de perfil/profissional antes de implantação.
- A autorização efetiva depende da combinação entre grants e RLS. A migração proposta não foi aplicada; portanto a segurança do ambiente remoto não está resolvida por esta entrega.

## Validação executada

- A causa da falha anterior do build foi `next/font/google`. `app/layout.tsx` agora usa `next/font/local` com os arquivos Geist já incluídos na dependência Next.js 16.3.8; mantém os tokens tipográficos e elimina o download em build.
- Após essa correção, `npm run build` terminou com código de saída 0: compilação, TypeScript e geração de 42 páginas estáticas concluídos.
- Após os ajustes finais de tema de `/meu-perfil` e `/identidade`, `npm run lint` terminou com código 0 e `npm run build` terminou com código 0 no estado de código atual; o build compilou, verificou TypeScript e gerou 42 rotas estáticas.
- Uma tarefa independente do Codex, registrada como “Diagnosticar dashboard VemGO Control” (`01a15441-d6d3-7680-aa87-0fc116b71ec2`), revisou os arquivos duas vezes em modo somente leitura. Confirmou o retry com e sem recarga quando Auth mantém `phone_confirmed_at`/`phone`, mas deixou explícito que a migração não está pronta para aplicação sem validações remotas e testes controlados.
- Na revisão independente atual, essa mesma tarefa verificou a tabela de catálogo (616 linhas, 615 propostas não aprovadas, 1 marcador de lista de Eletricista não recuperada), os pares candidatos de duplicidade, o runbook P0 e os estados no snapshot. A conversa de origem foi lida diretamente para confirmar os três IDs de mensagens de Eletricista; a revisão final confirmou que os IDs citados no CSV estão presentes e os dois IDs digitados incorretamente foram removidos.
- A revisão mais recente confirmou a pré-condição de colunas, o rollback do papel temporário no teste pgTAP, o ID do modal, as camadas do shell, o link de salto e o estado `aria-busy`. Não executou SQL nem alterou arquivos.
- Não foi executado parser/servidor PostgreSQL local nem teste de RLS/RPC/Auth. Lint e build validam código de aplicação, não as políticas ou a semântica da migração.

O bloqueio e a matriz reproduzível estão detalhados em [TESTES-P0.md](TESTES-P0.md). Nenhum resultado de segurança de banco foi simulado.

## Padronização visual iniciada

Adicionados layouts aninhados e navegação fixa compartilhada para `/cliente/**`, `/profissional/**` e `/controle/**`, mantendo ações preexistentes. Componentes comuns e temas estão descritos em [DIAGNOSTICO-PORTAIS.md](DIAGNOSTICO-PORTAIS.md). A auditoria agora descreve o contexto de `/cadastro-profissional/**`, `/admin/login`, `/identidade` e `/meu-perfil`; onboarding, login e verificação não herdam navegação autenticada por padrão. `/identidade` usa acento laranja profissional e `/meu-perfil` escolhe acento verde/laranja conforme o papel carregado. A inspeção visual via Computer Use foi interrompida porque a ferramenta não conseguiu determinar com confiança a URL aberta no Edge; não há validação visual a declarar. Telas autenticadas também não foram abertas, pois poderiam chamar Auth remoto sem fixtures locais. A tela de endereços ainda atualiza o endereço principal por duas escritas separadas.

O relatório [RECONCILIACAO-ESQUEMA-CATALOGO.md](RECONCILIACAO-ESQUEMA-CATALOGO.md) registra a fonte, a proveniência dos chats, os 15 rótulos e as divergências sem dados. [catalogo-historico-propostas.csv](catalogo-historico-propostas.csv) tem 615 códigos/nomes históricos; [reconciliacao-catalogo-servicos.csv](reconciliacao-catalogo-servicos.csv) os registra linha a linha junto de origem, situação e divergências conhecidas, sempre como proposta não aprovada. A conversa de Eletricista não contém lista final recuperável. A regra explícita do usuário para Água & Gás (galões de água; gás com 15 serviços; hidráulica em Encanador) prevalece sobre respostas antigas contraditórias. Os snapshots não têm linhas de categorias/serviços; a leitura remota anterior de 1 categoria ativa/130 serviços é histórica, não revalidada. Nenhum provedor/taxa/repasse foi confirmado.

## Próxima etapa planejada

1. Disponibilizar PostgreSQL 17 descartável autorizado e snapshot sanitizado integral; reconciliar a fonte de verdade e a cadeia-base antes de validar a migração P0.
2. Rodar o pgTAP de catálogo e os testes funcionais com fixtures locais para titularidade, RLS, papéis, Auth/telefone e concorrência. O estado atual não tem resultado de segurança de banco.
3. Lint/build passaram após os últimos ajustes de código; nesta continuação não houve alteração de código. Fazer QA visual quando o navegador puder abrir o servidor local com URL identificável e sessão/fixtures controladas.
4. Migrar o onboarding para o stepper compartilhado, consolidar o perfil cross-role e preparar autorização de servidor sem tratar o shell como controle de segurança.
5. Revisar/aprovar a lista proposta recuperada em CSV, obter a lista final de Eletricista e comparar com export local sanitizado; não criar seeds com base somente no histórico/UI. A tabela de reconciliação está preparada, mas a comparação de registros aguarda dados-fonte.
6. Executar a matriz de matching em duas conexões reais no DB isolado e especificar pagamentos a partir de regras/provedor aprovados, sem transações reais.
7. Só depois de validar ambiente e receber autorização específica para operação remota, preparar plano separado de aplicação e verificação.

## Próximas frentes de produto

- **Catálogo:** reconciliar taxonomia de serviços/categorias e relações do esquema, definir fonte única e fixtures, depois alinhar cadastro e navegação do cliente.
- **Matching:** fechar regras de elegibilidade e distância, tornar matching/seleção idempotentes e resolver a corrida de status com testes concorrentes.
- **Pagamentos:** definir estados do pagamento e ledger, requisitos do provedor/webhooks, assinatura e idempotência; impedir escrita direta pelo cliente e testar reconciliação sem transações reais.

Consulte [PLANO-MATCHING-PAGAMENTOS.md](PLANO-MATCHING-PAGAMENTOS.md) para o que existe nos snapshots e a matriz reproduzível. Estados e tipos presentes são checks de esquema; não comprovam uma máquina financeira ou decisão comercial.
