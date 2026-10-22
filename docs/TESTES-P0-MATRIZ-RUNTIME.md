# VemGO P0 — matriz runtime e evidências

Atualizado em 20/10/2026. Esta matriz especifica testes; não é evidência de execução. A migração P0 permanece local e não aplicada. Não usar os snapshots divergentes como baseline.

## Revisão estática da migration

### Pré-condições que a migration verifica

- Tabelas: `profiles`, `professionals`, `request_matches`, `payments`, `transactions`, `requests`, `addresses`, `orders`, `professional_services`, `service_prices`, `professional_regions`, `identity_verifications`, `audit_logs` e `auth.users`.
- Colunas de segurança listadas no bloco `expected(table_name, column_name)` para `profiles`, `professionals`, `request_matches`, `payments` e `transactions`.
- Assinaturas exatas: `match_request(uuid)`, `select_professional_for_request(uuid,uuid)`, `get_client_request_matches(uuid)`, `request_phone_verification(text)`, `verify_phone_code(text)` e `submit_identity_for_review()`.
- Tipos de retorno verificados: `integer` para matching, `uuid` para seleção, `text` para solicitação de telefone/submissão de identidade e `boolean` para verificação de telefone.

### Pré-condições ausentes ou incompletas

A migration usa, mas não verifica explicitamente antes do DDL:

- `auth.uid()` e as colunas `auth.users.phone` / `auth.users.phone_confirmed_at`;
- colunas usadas pelas RPCs em `requests`, `addresses`, `professional_services`, `service_prices`, `professional_regions`, `orders`, `audit_logs` e `identity_verifications`;
- disponibilidade dos papéis `anon`, `authenticated`, `service_role` e `postgres`, memberships, owners e privilégios do papel executor;
- o tipo de retorno de `get_client_request_matches(uuid)`;
- a policy de UPDATE própria em `profiles`, da qual o fluxo de atualização depende, embora grants de coluna sejam estreitados;
- a existência/extensão pgTAP, necessária somente ao teste, e o schema `extensions` usado por ele.

O teste local deve validar essas dependências antes de aplicar a migration. `CREATE OR REPLACE FUNCTION` mantém o owner existente, exceto `sync_verified_phone()`, cujo owner é explicitamente alterado para `postgres`; logo, o papel executor e os owners das outras funções precisam ser conhecidos.

## Achados e testes que devem expô-los

1. `match_request` filtra aprovação, estado de serviço, perfil ativo e identidade verificada, além de serviço, preço vigente e região. Não filtra `professionals.is_accepting_calls`. A expectativa de elegibilidade dessa flag deve ser confirmada como regra de negócio; incluí-la como cenário diagnóstico, não como resultado já garantido.
2. `select_professional_for_request` revalida aprovação, estado ativo, identidade e preço vigente, mas não revalida serviço/região ativos. Deve existir fixture com match antigo e relação serviço/região desativada; registrar se a seleção ainda passa. A regra desejada depende da política de validade de um match já emitido.
3. As RPCs de matching travam a solicitação; seleção também trava o match escolhido. Elas não travam explicitamente as linhas de perfil/profissional usadas na elegibilidade. Uma alteração de aprovação concorrente pode ocorrer depois da leitura elegível; o teste em duas sessões deve registrar essa janela, não presumir que está fechada.
4. `get_client_request_matches` não é redefinida pela migration. A migration pressupõe que a função já faz autenticação e valida titularidade; verificar seu corpo e seu contrato na fonte-base antes de testar retorno para usuário alheio.
5. `request_phone_verification` está deliberadamente fail-closed: usuário autenticado passa pela checagem inicial, mas a função sempre termina com erro enquanto SMS/WhatsApp não estiver configurado. O teste correto exige erro e ausência de código/efeito colateral, não um OTP funcional.
6. `submit_identity_for_review` exige registro de verificação pendente do próprio usuário e marca o perfil como pendente; não aprova profissional nem identidade. Não criar documento ou consentimento fictício para este caso.
7. `match_request` usa `ON CONFLICT (request_id, professional_id) DO NOTHING`. A migration não verifica a constraint única correspondente; a base deve provar que ela existe. A função exige estado `classified`, então uma chamada repetida após transição para `matching` deve falhar pelo estado, não é idempotência de chamada bem-sucedida.

## Matriz de grants e políticas

Para cada assertiva, registrar resultado, role efetivo e o catálogo consultado. `has_table_privilege` não basta: permissões por coluna podem permanecer depois de um `REVOKE` no nível da tabela.

| ID | Objeto / cenário | Fixture e ação | Resultado esperado | Evidência SQL |
|---|---|---|---|---|
| G1 | `profiles` | Conferir grants de `authenticated`, `anon` e o efeito de `PUBLIC`; tentar INSERT e UPDATE | `authenticated`: SELECT e UPDATE somente de `full_name`, `avatar_url`, `professional_onboarding_step`; sem INSERT direto. `anon` sem acesso direto | `has_table_privilege`, `has_any_column_privilege`, `has_column_privilege` para cada coluna de INSERT/UPDATE revogada |
| G2 | `professionals` | Conferir permissões por coluna; tentar inserir perfil profissional e elevar estado/aprovação | SELECT; INSERT somente em `id`, `display_name`, `bio`, `document_type`, `document_number`; UPDATE somente `is_accepting_calls` | Consultar grants de tabela/coluna para todos os campos da lista da migration |
| G3 | `request_matches` | Conferir SELECT e negar DML direto | `authenticated` apenas SELECT sujeito a RLS; sem INSERT/UPDATE; policy `request_matches_update_own` ausente | Grants de tabela e coluna; `pg_policies` para confirmar ausência da policy |
| G4 | `payments` | Conferir SELECT e negar escrita direta | `authenticated` apenas SELECT sujeito à policy de titularidade; sem INSERT/UPDATE | Grants por tabela e coluna; registrar o owner/policy e testar leitura por titular e alheio |
| G5 | `transactions` | Conferir todas as permissões de `anon` e `authenticated` | Sem acesso direto concedido a esses papéis | `has_table_privilege` e `has_any_column_privilege` para SELECT/INSERT/UPDATE; testar DELETE/TRUNCATE no catálogo |
| G6 | Papel herdado | Criar role `NOLOGIN` de teste e conceder membership em `authenticated`; conferir direitos e membership efetivos | Herda somente os direitos estreitos; não pode elevar papel, aprovar profissional ou alterar ledger | `pg_auth_members`, `pg_has_role`, funções `has_*_privilege`; teste com `SET ROLE` em sessão separada |
| G7 | Funções | Conferir EXECUTE para `anon`, `authenticated`, `service_role` e ACL de `PUBLIC` | `anon`/`PUBLIC` não executam as RPCs restringidas; `authenticated` executa as funções permitidas; `service_role` conserva as concessões explicitadas pela migration | `has_function_privilege`, `pg_proc.proacl`/`aclexplode`; comparação de ACL antes/depois para grants preexistentes preservados |
| G8 | Owner e contexto de segurança | Inspecionar funções definidas pela migration | `sync_verified_phone()` owned por `postgres`; funções `SECURITY DEFINER` têm `search_path` fixo | `pg_get_userbyid(proowner)`, `pg_proc.prosecdef`, `pg_proc.proconfig` |
| RLS1 | `profiles` | Usuários A/B; executar SELECT/UPDATE sob cada claim, incluindo tentativa de alterar a linha de B | A só lê/atualiza linha própria e colunas permitidas; B não observa efeitos de A | `pg_policies`; como role autenticado, SELECT e `UPDATE ... RETURNING`; conferir a linha depois como executor de teste |
| RLS2 | `professionals` | Profissionais A/B; consultar as próprias linhas; inserir/atualizar como titular e alheio | Titularidade e grants restringem o próprio perfil; campos de aprovação continuam indisponíveis | Duas sessões/claims; resultado de SELECT/DML; colunas de aprovação antes/depois |
| RLS3 | `request_matches` | Match atribuído ao profissional A e outro a B; tentar leitura cruzada e escrita direta | A não lê match de B; nenhum profissional altera diretamente status ou titularidade | SELECT sob claims A/B; tentativa UPDATE deve falhar; catálogo confirma policy de UPDATE removida |
| RLS4 | `payments` | Pagamento de cliente A e pagamento de cliente B | A lê somente o que a policy preexistente autoriza; não vê o pagamento de B nem altera valores | `pg_policies`; SELECT como A/B; comparação de resultados sem valores financeiros reais |
| RLS5 | `transactions` | Ledger sintético associado a pagamentos dos dois clientes | Acesso fica restrito conforme grants e policy do baseline; cliente não altera ledger | `pg_policies`, grants e SELECT/UPDATE como A/B; a migration não cria policy nova |

Claims para os testes de RLS devem ser sintéticas e limitadas à transação. Exemplo de configuração do harness, não executado:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<uuid-sintético-A>', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"<uuid-sintético-A>","role":"authenticated"}',
  true
);
-- Consultas/DML do cenário aqui.
ROLLBACK;
```

O baseline deve confirmar como `auth.uid()` lê os claims e qual papel pode executar cada sessão. Não usar claims de contas reais.

## Matriz das RPCs e efeitos colaterais

Fixtures mínimas: dois usuários clientes e dois profissionais sintéticos em Auth/perfis; uma solicitação de cada cliente; endereço e serviço sintéticos; serviço profissional, preço vigente e região para ao menos um candidato; dois matches para uma seleção; order/audit vazios. Criar apenas os registros necessários. Não inserir documentos, consentimentos, telefones reais, pagamentos reais ou dados dos snapshots.

| ID | RPC / caso | Ação | Resultado esperado e evidência |
|---|---|---|---|
| F1 | `match_request` titular | Cliente A chama com solicitação própria `classified`, serviço/endereço válidos e profissional elegível | Retorno igual a matches inseridos; só candidatos elegíveis aparecem; solicitação muda para `matching` se inseriu. Conferir retorno, matches e estado |
| F2 | `match_request` anônimo/alheio | `anon` chama ou cliente B passa ID da solicitação de A | `anon` sem EXECUTE; B recebe erro/não obtém dados; nenhuma linha/estado muda |
| F3 | `match_request` negativos | Repetir com estado incorreto, serviço/endereço ausente e profissional inelegível/inativo/sem preço ou região | Falha fechada ou candidato excluído conforme o caso; conferir contagens e estado antes/depois. Incluir `is_accepting_calls=false` como diagnóstico de regra pendente |
| F4 | `match_request` duplicidade | Pedido `classified` com match já existente | Nenhum duplicado; verificar índice/constraint única em `request_matches(request_id, professional_id)` e retorno/estado |
| F5 | `select_professional_for_request` titular | Cliente A escolhe match próprio pendente/enviado, com profissional elegível e preço vigente | Um pedido confirmado; match escolhido aceito; demais pendentes/enviados cancelados; pedido `matched`; uma auditoria. Conferir as quatro tabelas |
| F6 | `select_professional_for_request` alheio/anônimo | B tenta pedido de A; `anon` tenta executar | EXECUTE de anon negado; B falha na titularidade; zero efeitos colaterais |
| F7 | Seleção com match/preço/eligibilidade inválidos | Match ausente/encerrado, solicitação não `matching`, profissional inelegível ou preço ausente/vencido | Erro e nenhuma ordem, transição, alteração de matches ou auditoria |
| F8 | Match obsoleto | Criar match válido e depois desativar serviço/região antes da seleção | Registrar se seleção ainda aceita. O corpo atual não revalida serviço/região; decidir se é comportamento permitido antes de classificar como regressão |
| F9 | `get_client_request_matches` | A solicita seus matches; B tenta ID de A; anon tenta EXECUTE | A vê apenas dados próprios; B não recebe dados de A; anon não executa. Fixar no baseline se caso alheio retorna vazio ou erro |
| F10 | `request_phone_verification` | Testar anon, sem sessão, telefone vazio e usuário autenticado | Sem sessão/anon sem acesso; autenticado recebe erro de canal não configurado; nenhum OTP/registro é criado e nenhum código é retornado |
| F11 | `verify_phone_code` | Testar ACL anônima e contrato funcional com fixture de código sintético | Anon negado; autenticado mantém EXECUTE. Resultado de código válido/inválido deve ser baseado no corpo do baseline, não presumido pela migration |
| F12 | `sync_verified_phone` | Usuário local confirmado no Auth; repetir chamada; também tentar sem telefone confirmado | Sincroniza somente `auth.users.phone` e `phone_confirmed_at` do próprio usuário; segunda chamada conserva esses valores; não confirmado/sem sessão falha; owner `postgres` |
| F13 | `submit_identity_for_review` | Verificação pendente sintética própria; depois tentar sem pendência e com pendência só de B | Próprio usuário vira `pending`; alheio/sem pendência falha; nenhuma aprovação profissional ou de identidade é concedida |
| F14 | Ausência de efeitos colaterais | Para cada negação acima, capturar estado mínimo antes/depois | Sem novas ordens/matches/auditoria/OTP, sem alteração de terceiros; exceções e rollback registrados |

Não interpretar `service_role` como usuário de cliente: testar suas concessões só com fixtures locais e registrar separadamente os direitos preservados pelo baseline.

## Concorrência em duas sessões

Executar somente depois dos testes funcionais e sempre no banco descartável.

### C1 — duas seleções para a mesma solicitação

1. Preparar uma solicitação `matching`, dois matches válidos e nenhuma ordem.
2. Sessão A: iniciar `BEGIN ISOLATION LEVEL READ COMMITTED`, chamar `select_professional_for_request` e manter a transação aberta.
3. Sessão B: iniciar outra transação `READ COMMITTED` e chamar a função para a mesma solicitação; confirmar que aguarda o lock da solicitação.
4. Confirmar A; B deve retomar, observar o estado atualizado e falhar sem efeitos adicionais.
5. Evidência: resultado de cada sessão, uma única ordem por solicitação, um único match aceito e solicitação em estado final coerente.

### C2 — revogação de elegibilidade durante seleção

Sincronizar duas sessões para revogar `verification_status` ou estado ativo enquanto a seleção avança. Se a revogação tiver commit antes da consulta de elegibilidade, a seleção deve rejeitar. Para a interleaving após a consulta de elegibilidade, o corpo não bloqueia as linhas de perfil/profissional; registrar se a seleção conclui após a revogação e classificar a janela como lacuna se confirmada. Uma transição determinística pode exigir um hook/trigger temporário de teste no banco descartável; não adicionar esse hook ao esquema do produto.

Evidência mínima: timestamp/ordem dos commits, resultado das duas sessões, estado final de profile/professional/request/match/order e auditoria sanitizada.

## Comandos locais — somente após receber e aprovar o baseline

Não executar estes comandos no checkout atual. Preparar um diretório temporário exclusivo contendo uma configuração Supabase local, a cadeia completa de migrations-base verificada, a migration P0, os testes e apenas fixtures sintéticas. Não vincular o projeto temporário a um projeto remoto. Inspecionar a configuração e migrations antes de iniciar.

```powershell
$Repo = 'C:\VemGO\vemgo'
$SupabaseCli = Join-Path $Repo 'node_modules\.bin\supabase.cmd'
$P0Project = 'C:\VemGO-P0-LOCAL-<id-unico>'

Set-Location $P0Project
& $SupabaseCli start
if ($LASTEXITCODE -ne 0) { throw 'Supabase local não iniciou; interromper.' }

# Local por padrão; não adicionar --linked. O diretório deve conter a cadeia
# completa aprovada e um seed somente sintético.
& $SupabaseCli db reset --no-seed
if ($LASTEXITCODE -ne 0) { throw 'Baseline/migration local falhou; interromper.' }

& $SupabaseCli test db --local 'supabase/tests/p0_authorization_hardening.test.sql'
if ($LASTEXITCODE -ne 0) { throw 'pgTAP falhou; guardar saída sanitizada.' }
```

O caminho `<id-unico>` é um placeholder, não um nome de projeto existente. Não preencher o diretório com snapshots atuais. Não executar `db push`, `db pull`, `--linked` ou comandos de conexão remota. O teste runtime com fixtures e a concorrência devem ser executados separadamente depois que seus adaptadores forem validados contra o baseline; o arquivo pgTAP atual cobre somente a parte catalogal.

## Estado e dependências para liberar execução

- **Preparado:** a migration foi revisada estaticamente; o pgTAP catalogal foi ampliado; esta matriz especifica testes de autorização, titularidade, isolamento, efeitos colaterais e concorrência.
- **Não executado/aprovado:** migration, parser SQL, pgTAP, RLS com claims, RPCs funcionais, Auth/telefone, isolamento entre linhas e concorrência.
- **Baseline necessário:** export lógico somente de esquema, datado e com proveniência, do estado imediatamente anterior à P0; ou cadeia completa de migrations que reconstrua esse estado. Incluir DDL, constraints/índices, triggers, functions, policies, owners, ACLs/memberships e customizações VemGO sobre `auth`; não incluir linhas de usuários, telefone, OTP, documentos, consentimentos, pedidos, auditoria, pagamentos ou dados reais.
- **Stack/dependências:** stack Supabase local compatível que inicialize `auth.users`, `auth.uid()` e roles; PostgreSQL 17; pgTAP disponível no schema `extensions`; executor local autorizado com privilégios necessários para migration, criar role temporário e testar duas conexões.
- **Contrato de fixtures:** confirmar defaults, campos NOT NULL, triggers de cadastro, enum/check constraints e formato de claims no baseline antes de escrever um seed de testes. Usar IDs/endereços/serviços sintéticos; nenhum documento ou consentimento fictício.
- **Decisões pendentes:** regra de elegibilidade para `is_accepting_calls`; validade de match se serviço/região for desativado; resultado esperado para usuário alheio em `get_client_request_matches`; comportamento desejado quando aprovação é revogada concorrentemente.

Até essas dependências serem resolvidas, todo resultado de segurança permanece **pendente**.
