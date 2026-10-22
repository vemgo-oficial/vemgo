# Testes reproduzíveis do P0

## Estado do ambiente

Em 20/10/2026, `supabase/config.toml` existe e declara PostgreSQL 17, mas não contém uma cadeia de migrações-base: `schema_paths = []`, `supabase/migrations/` contém somente a migração P0 e o arquivo de seed configurado `supabase/seed.sql` não existe. A CLI Supabase 2.121.0 está instalada como dependência local (`node_modules/.bin/supabase.cmd`); não é necessário instalar a CLI. `supabase/schema.sql` é incompatível com o snapshot de raiz `supabase-schema.sql`: falta-lhe `select_professional_for_request`, `get_client_request_matches`, `request_phone_verification`, `verify_phone_code`, as colunas `profiles.phone_verified_at`, `profiles.identity_verified_at`, `profiles.client_verification_status` e `professionals.is_accepting_calls`, além da policy `profiles_update_own`. A migração exige alguns desses objetos e colunas. As leituras remotas anteriores indicaram que o estado-alvo correspondia ao snapshot de raiz, mas isso precisa de reconfirmação em fonte controlada; nenhum dos dois snapshots é autoritativo por si só.

O Docker está instalado, mas a consulta local `docker info` não conseguiu ler `C:\Users\fabio.jau\.docker\config.json` e recebeu acesso negado no named pipe `docker_engine`. Isso identifica bloqueio do processo atual ao perfil/configuração e à API do daemon; não distingue se o engine também está parado. Não há listener visível em 5432/54321, e `psql`, `pg_ctl` e `pg_isready` não estão no PATH. WSL está instalado, mas enumerar distribuições foi negado pelo Windows com `E_ACCESSDENIED`. A CLI Supabase local teve sua verificação de versão bloqueada anteriormente por tentativa de telemetria fora do repositório; não tentei ler o arquivo Docker, elevar permissões nem contornar as restrições. Portanto não há banco local nem staging equivalente validável nesta sessão. Nenhum teste SQL, RLS, ACL, RPC, Auth ou concorrência foi executado. Não se consultou nem alterou o Supabase remoto.

## Verificação de catálogo após preparar um ambiente isolado

O arquivo `supabase/tests/p0_authorization_hardening.test.sql` é um teste pgTAP de privilégios e RLS. Ele precisa ser executado **depois** da migração, em banco local descartável restaurado de uma base compatível com o alvo. O teste aborta se seu papel temporário já existir e envolve toda a atividade em transação com `ROLLBACK`.

**Limite observado na leitura do teste:** pgTAP confirma `relrowsecurity` para cinco tabelas, grants/column grants, execução de algumas RPCs e um papel customizado que herda `authenticated`. As asserções “lê sob RLS” verificam somente privilege SELECT; não executam leituras com JWT/`auth.uid()` distintos para provar isolamento entre linhas. Também não cobrem todos os papéis/memberships personalizados, o comportamento funcional das RPCs, sincronização Auth/telefone nem concorrência. Esses continuam como casos separados da matriz abaixo.

Não execute `db reset`, `db push` ou migrações neste checkout enquanto a cadeia-base não estiver definida: a pasta atual não recria o esquema completo e os snapshots divergem. A pré-condição da migração verifica algumas colunas de segurança, mas não substitui a revisão completa do esquema/ACLs.

## Testes funcionais positivos e negativos pendentes

Preparar pelo menos dois clientes de teste, dois profissionais e uma solicitação fictícia no banco isolado. Usar IDs fixos e isolados no fixture, nunca contas reais.

| Área | Positivo | Negativo |
|---|---|---|
| `match_request` | cliente titular, pedido classificado e profissional elegível produzem matches | cliente diferente não vê/gera matches; anônimo não executa; profissional sem aprovação, inativo ou não verificado não aparece |
| seleção do profissional | cliente titular seleciona match pendente e cria no máximo um pedido | outro cliente, match inexistente/encerrado, profissional inelegível ou sem preço ativo falha sem criar pedido ou alterar status |
| RLS e privilégios | titular lê e altera somente campos permitidos; profissional altera apenas disponibilidade | papel não titular, papel customizado herdado de `authenticated`, `anon` e cliente não mudam `user_type`, aprovação, `request_matches`, pagamentos ou transações |
| proprietário e execução | papel de implantação autorizado troca owner para `postgres`; `authenticated` executa apenas RPCs concedidas | papel comum/`anon` não executa; verificar grants preexistentes diretos e por membership para todos os papéis personalizados |
| telefone | Auth confirma `phone_change`, sincronização grava o mesmo telefone/horário do Auth e retry idempotente mantém o valor | telefone não confirmado, usuário sem sessão ou tentativa de fornecer telefone pelo cliente não sincronizam; confirmar recuperação após recarga |
| concorrência matching | duas transações independentes tentam selecionar a mesma solicitação e só uma ordem válida é confirmada | desativar ou retirar a aprovação do profissional enquanto matching/seleção ocorre; verificar que a operação não conclui com elegibilidade revogada |

Antes de rodar, verificar no catálogo todos os papéis e memberships com efetivo privilégio, além de `CREATE` em `public`, owners e ACLs das funções. O pgTAP cobre os grants esperados e um papel customizado que herda `authenticated`; ele não substitui a inspeção de todos os papéis existentes nem os testes funcionais com fixtures.

## Runbook reproduzível — ainda não executado

1. Com autorização operacional local, disponibilizar o Docker Desktop já instalado ao usuário atual, sem elevação nem mudança de políticas. O teste desta sessão encontrou `docker` instalado, mas o daemon continua inacessível por named pipe negado; não há listener PostgreSQL em 5432/54321 nem `psql`, `pg_ctl` ou `pg_isready` no PATH. Não mudar política, usar outro perfil para contornar a permissão ou elevar o processo.
2. Obter do responsável pelo ambiente um dump integral sanitizado e datado do esquema-alvo, incluindo definições necessárias de `auth`, extensões, owners, ACLs, policies e funções, mais a cadeia completa de migrations anterior. Não usar dados pessoais nem segredo operacional no fixture.
3. Criar um diretório de trabalho descartável fora do checkout e inicializar nele uma instância Supabase local PostgreSQL 17 usando a CLI local já instalada (`C:\VemGO\vemgo\node_modules\.bin\supabase.cmd`). Não iniciar o stack a partir deste checkout enquanto `supabase/migrations/` não puder reconstruir a base: isso executaria a proposta P0 numa base nova sem pré-condições. Se a CLI exigir gravação fora do workspace e o sandbox negar, parar e disponibilizar um executor aprovado; não desabilitar telemetria/política para contornar.
4. Restaurar o dump na instância descartável conforme o formato do dump (`pg_restore` para archive ou `psql` para SQL plain), validar a origem e comparar objetos/ACLs com o manifesto do ambiente-alvo. Não importar a base em `supabase/schema.sql` ou `supabase-schema.sql` por inferência.
5. Antes de executar a migration, revisar cada pré-condição, DDL, owner, grant e política contra a base restaurada; resolver incompatibilidades e declarar formalmente essa base como fonte daquela validação. Guardar em arquivo local fora do Git os catálogos de tabelas/colunas, policies, roles/memberships, owners e grants. Só então aplicar a migration **local** no papel de deploy declarado, verificar ownership de `sync_verified_phone`, executar o pgTAP e a matriz funcional abaixo com dois usuários e dois+ profissionais fictícios.
6. Demonstrar concorrência com duas conexões PostgreSQL independentes e fixtures resetáveis; registrar os estados antes/depois e os erros esperados. Ao encerrar, descartar somente o diretório/instância temporários identificados como tal e guardar apenas evidências sanitizadas revisáveis.

O comando do runbook ainda não foi executado. A CLI local existe, mas só poderá ser iniciada quando o daemon estiver acessível e houver baseline confiável; nenhum teste de banco foi realizado.

## Bloqueio a resolver

O próximo bloqueio concreto é disponibilizar o daemon Docker ao usuário atual dentro das permissões existentes e receber a cadeia-base/dump sanitizado integral de uma fonte autoritativa, além de registrar o papel executor pretendido. Até isso ocorrer, os casos acima permanecem **pendentes**, não aprovados. Não se acessou staging nem Supabase remoto.

## Adendo: matriz complementar preparada em 20/10/2026

O Docker foi validado pelo proprietário no PowerShell normal do Windows; o processo do agente continua sem acesso ao named pipe, então a execução deve ocorrer no terminal Windows autorizado. Essa diferença não é motivo para contornar o sandbox.

Foi ampliado `supabase/tests/p0_authorization_hardening.test.sql` para cobrir grants de coluna residuais de INSERT/UPDATE, privilégios de tabela de `anon`/`authenticated`, acesso por coluna a `transactions`, EXECUTE de RPCs, `SECURITY DEFINER` e `search_path`. A ampliação está apenas preparada: não foi executada nem parseada por PostgreSQL.

A matriz de execução, os cenários de RLS com duas identidades, RPCs, ausência de efeitos colaterais e concorrência estão em [TESTES-P0-MATRIZ-RUNTIME.md](TESTES-P0-MATRIZ-RUNTIME.md). Ela também registra pré-condições não verificadas pela migration, incluindo `auth.uid()`, colunas utilizadas nas funções, papéis/memberships e contratos de policies.

O histórico Git local não contém uma cadeia-base: `supabase-schema.sql` estava vazio em `HEAD` e foi preenchido localmente; `supabase/schema.sql` está versionado, mas não satisfaz as pré-condições P0. O único arquivo em `supabase/backups/` é uma captura de uma função. Nenhum desses artefatos foi tratado como baseline.

**Estado desta continuação:** análise estática concluída; teste pgTAP e matriz runtime preparados; nenhum SQL, parser PostgreSQL, migration, reset, restore ou consulta remota executados. Nenhum teste está aprovado. O desbloqueio mínimo é obter, de fonte autorizada, baseline/cadeia completa do estado imediatamente anterior à P0 e manifestos de roles, ACLs, policies e extensões, sem dados pessoais.
