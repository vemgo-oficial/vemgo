# Reconciliação de esquema e catálogo VemGO

Atualizado em 20/10/2026. Análise local e de histórico disponível; nenhuma consulta ao Supabase remoto foi feita nesta etapa.

## Fonte de esquema

Não há uma fonte autoritativa comprovável no checkout atual.

| Fonte | Evidência | Limite |
|---|---|---|
| `supabase/schema.sql` | Snapshot versionado e com definições de `categories` e `services`. | Diverge do segundo snapshot e não inclui as RPCs/colunas citadas no relatório P0. Não há cadeia-base de migrações que permita reconstruir a origem. |
| `supabase-schema.sql` | Snapshot local contém mais funções, colunas e políticas que `supabase/schema.sql`; é o que mais se aproxima da descrição do estado remoto em relatórios anteriores. | Está rastreado e modificado no estado atual do Git; não foi gerado nem autenticado nesta etapa por uma fonte controlada. Correspondência histórica não basta para declará-lo autoritativo. |
| `supabase/backups/review_professional_predeployment_20261019.txt` | Captura somente de leitura de 19/10 de `review_professional` e seus metadados. | É evidência de uma função, não um dump integral nem dados de catálogo. |
| `supabase/migrations/` | Existem três propostas/migrações P0/revisão no checkout. | Não reconstituem o esquema-base nem a carga de catálogo. |

**Conclusão:** `supabase-schema.sql` é a hipótese local mais compatível com as leituras remotas já documentadas, mas a fonte autoritativa ainda precisa ser um dump sanitizado, datado e obtido do ambiente controlado correto, seguido de cadeia-base versionada. A migração P0 não pode ser declarada final nem testada contra um dos snapshots por mera conveniência.

## Banco local ou staging

- Não há instância PostgreSQL local identificada: `psql`, `pg_ctl` e `pg_isready` não estão no PATH; não há serviço/processo PostgreSQL nem listener nas portas 5432/54321.
- Docker Desktop está instalado, mas o named pipe do daemon retorna acesso negado. WSL está instalado, porém a enumeração somente leitura das distribuições foi negada com `E_ACCESSDENIED`. Não tentei iniciar serviços, instâncias ou elevar permissões.
- A configuração Supabase declara PostgreSQL 17, mas o diretório de migrações não possui o esquema-base. Não existe evidência local de staging sanitizado.
- Não se consultou nem escreveu no Supabase remoto para tentar preencher a lacuna.

**Bloqueio concreto:** é necessário fornecer um PostgreSQL 17 descartável, acessível sob as permissões já autorizadas, e um dump sanitizado completo compatível com o ambiente alvo. Com esses dois itens, executar a migração e a matriz de testes em database isolado. Não executar `db reset`/`db push` sobre este checkout sem cadeia-base.

## Catálogo: lista de 15 categorias recuperada localmente

As duas listas de interface em `app/page.tsx` e `app/cliente/page.tsx` têm as mesmas 15 posições. A busca no histórico recuperou os chats das 15 categorias. Em 14 deles, a resposta mais recente do assistente contém uma lista de 615 códigos/nomes proposta; a conversa de Eletricista não tem a lista final. A extração auditável está em [catalogo-historico-propostas.csv](catalogo-historico-propostas.csv), com título/ID da conversa, ID da mensagem e linha original. São respostas históricas produzidas pelo assistente a pedido do usuário, ainda não confirmação de que o usuário aprovou cada item ou de que foi carregado no banco.

A tabela linha a linha está em [reconciliacao-catalogo-servicos.csv](reconciliacao-catalogo-servicos.csv): categoria, código, nome, origem, situação e divergências. Ela inclui 615 propostas não aprovadas e uma linha de Eletricista sem código/nome porque a lista final não foi recuperada. Marca quatro pares de duplicidade literal e seis pares de sobreposição semântica como candidatos para revisão humana. Como nenhum snapshot local contém dados/seed de serviços e não houve export sanitizado do banco, a divergência em relação ao catálogo instalado está explicitamente marcada como **não comparada** para todos os serviços.

| Ordem | Rótulo de UI (landing / cliente) | Códigos históricos recuperados pela tarefa Codex | Contagem histórica |
|---:|---|---|---:|
| 1 | Eletricista | Sem lista final recuperável. O classificador local contém 19 códigos `ELE`; o SQL menciona `ELE-098`, que não é evidência do catálogo final. | 0 recuperados |
| 2 | Encanador | `ENC-001` a `ENC-091` | 91 |
| 3 | Chaveiro | `CHA-001` a `CHA-051` | 51 |
| 4 | Faz-tudo | `FZT-001` a `FZT-050` | 50 |
| 5 | Montador de móveis | `MOV-001` a `MOV-059` | 59 |
| 6 | Ar-condicionado | `CLI-001` a `CLI-020` | 20 |
| 7 | Borracheiro | `BOR-001` a `BOR-071` | 71 |
| 8 | Mecânico | `MEC-001` a `MEC-032` | 32 |
| 9 | Personal Trainer | `PT-001` a `PT-020` | 20 |
| 10 | Fretes & Mudanças | `FRE-001` a `FRE-023` | 23 |
| 11 | Informática | `INF-001` a `INF-030` | 30 |
| 12 | Caçambas & Resíduos | Histórico nomeia “Locação de mini caçamba/caçamba/containers / resíduos”; `RES-001` a `RES-068` | 68 |
| 13 | Lavagem Automotiva | `LAV-001` a `LAV-038` | 38 |
| 14 | Limpeza & Conservação | Histórico usa “Limpeza”; `LIM-001` a `LIM-041` | 41 |
| 15 | Água & Gás | `AGU-001` a `AGU-006` (galões) e `GAS-001` a `GAS-015` | 21 |

Os intervalos históricos recuperados para as 14 listas quantificadas totalizam 615 códigos. São propostas de assistente, não linhas de banco. Os títulos e IDs reais das 15 conversas estão incluídos na seção de proveniência abaixo e nas linhas do CSV.

### Divergências e reconciliação pendente

- Os rótulos e a ordem entre as duas listas de interface estão alinhados. Há duplicação de definição no código (dois arrays), não evidência de registros duplicados no banco.
- A extração das propostas históricas tem quatro grupos de duplicidade literal: `FZT-012`/`FZT-033` (acessórios de banheiro), `FZT-013`/`FZT-034` (acessórios de cozinha), `FZT-003`/`MOV-028` (prateleira) e `FZT-004`/`MOV-030` (nicho). Há ainda sobreposições de escopo: `FZT-016`/`MOV-051` (dobradiça), `FZT-017`/`MOV-054` (puxador), `FZT-024`/`MOV-042` (porta de armário), `FZT-025`/`MOV-044` (gaveta), `FZT-028`/`MOV-033` (fixação na parede) e `FZT-029`/`MOV-050` (reforço). Os pares precisam ser aceitos, consolidados ou mantidos deliberadamente separados antes de seed.
- `supabase/schema.sql` e `supabase-schema.sql` contêm estrutura de tabelas, índices e policies para categorias/serviços, mas não inserções, `COPY` ou seeds de linhas. Não é possível comparar seus registros, códigos, duplicatas ou itens ausentes.
- O relatório central preserva uma observação remota histórica, de leitura, de apenas uma categoria ativa (“Elétrica”) e 130 serviços ativos. Não foi reconsultada neste ciclo. Isso diverge da taxonomia de 15 rótulos de UI e dos 615 códigos/propostas em históricos, mas não revela quais serviços pertencem a cada categoria, se os 130 incluem equivalências ou quantos itens seguem ativos. O snapshot local não contém dados, portanto os 615 códigos propostos estão sem correspondência local verificável; não se pode chamá-los de ausências do banco remoto.
- A extração histórica contém quatro pares de duplicidade literal candidatos: `FZT-012`/`FZT-033` (acessórios de banheiro), `FZT-013`/`FZT-034` (acessórios de cozinha), `FZT-003`/`MOV-028` (prateleira) e `FZT-004`/`MOV-030` (nicho), conforme os itens e as linhas do CSV acima. Também há seis sobreposições de escopo Faz-tudo/Montador de móveis listadas acima; a decisão de escopo e categoria ainda depende dos responsáveis pelo catálogo.
- `CLI` é um prefixo ambíguo para climatização. A modalidade Água & Gás junta entrega/troca de galão (`AGU`) a serviço de mangueira/regulador/diagnóstico de gás (`GAS`), com fronteira ainda pendente frente a Encanador.
- A tabela de banco chama o agrupamento de `categories` e liga serviços por `category_id`; a interface hoje chama cada entrada de `category`, mas na lista de destaque usa nomes de profissão/serviço. A semântica de categoria versus serviço precisa ser decidida com a carga real e a lista original antes de qualquer seed ou mudança no matching.

### Próxima reconciliação segura

1. Recuperar uma lista final de Eletricista e registrar a confirmação do usuário para as propostas ainda em CSV; manter os IDs de origem como proveniência.
2. Exportar somente leitura do ambiente alvo autorizado, contendo `categories(id, code, name, slug, is_active, display_order)` e `services(id, category_id, code, name, slug, is_active, display_order)`.
3. Comparar por código normalizado e UUID; sinalizar equivalências de nome, serviço órfão, duplicata e diferença de ordenação para revisão. Não excluir nem gravar nada.
4. Revisar duplicidades FZT e cruzamentos FZT/MOV; validar prefixo `CLI`, separação Água/Gás e a regra de preço fixo/visita técnica usando as mensagens explícitas do proprietário.
5. Aprovar uma tabela canônica de mapeamento e então preparar seed/migração local revisável.

## Regra de preço recuperada, sem provedor financeiro

A conversa “Banco VemGO Água Gás” (`6ac6e2c6-4bcc-83e9-84f4-62dce83d80c2`), mensagem do usuário `3892ed91-89d6-4911-ae15-ee0f82c8d9ef`, orienta priorizar serviço com preço definido, evitar orçamento aberto inicialmente, oferecer visita técnica com preço para casos que precisam de avaliação e permitir dúvidas/fotos para evitar o desvio da contratação para fora da plataforma. É orientação de catálogo/fluxo; não define provedor de pagamento, tarifa de gateway, comissão da VemGO ou calendário de repasse.

### Proveniência do histórico acessível

As conversas são do projeto ChatGPT `g-p-6ac66726d5608191b08db1d116bfdedb`; os identificadores abaixo foram conferidos em `list_threads` e os conteúdos disponíveis foram lidos com a ferramenta de leitura do Codex:

| Conversa | ID |
|---|---|
| Banco VemGO Eletricista | `6ac6b4d5-1e34-83e8-9eab-6a945b11872c` |
| Banco VemGO Encanador | `6ac6b68f-8f3c-83e9-8541-83cc0a1ca594` |
| Banco VemGO Chaveiro | `6ac6db42-27c4-83e9-85d8-a7b3bd170986` |
| Banco VemGO Faz Tudo | `6ac6dbb2-ef90-83e9-8484-e4f5100ba737` |
| Banco VemGO Montador de Móveis | `6ac6c42c-f4e0-83e9-846d-08841cb37160` |
| Banco VemGO Climatização | `6ac6c58d-e37c-83e8-baa1-e6a1086d8ef1` |
| Banco VemGO Borracheiro | `6ac6c859-4834-83e9-81fa-0297610493de` |
| Banco VemGO Mecânica | `6ac6c8cc-d5b4-83e9-a56a-af24f619ed26` |
| Banco VemGO Personal Trainer | `6ac6dffe-5500-83e9-859c-df8994115017` |
| Banco VemGO Fretes e Mudanças | `6ac6e069-87c4-83ea-9ec5-c16eaa9885f4` |
| Banco VemGO Informática | `6ac6e205-cdfc-83e8-924e-78435a26fe36` |
| Banco VemGO Resíduos | `6ac6e240-af80-83e9-967f-50c1c83a94f7` |
| Banco VemGO Lavagem Automotiva | `6ac6e27b-4cc4-83e9-860c-2dd834924d28` |
| Banco VemGO Limpeza | `6ac6c7f4-00fc-83e9-b40f-3088d9892751` |
| Banco VemGO Água Gás | `6ac6e2c6-4bcc-83e9-84f4-62dce83d80c2` |

A mensagem do usuário `3892ed91-89d6-4911-ae15-ee0f82c8d9ef` no chat Água Gás define que o serviço seja pré-precificável, com chat/foto apenas para peculiaridades e sem orçamento aberto. A mensagem `2e0835c2-cbf6-49a2-a797-1f63baafa8ac` especifica que Água fica limitada a entrega de galões nos tamanhos praticados e manda remover serviços hidráulicos para Encanador, além de pedir 15 serviços de gás. Essa regra do usuário prevalece sobre respostas anteriores do assistente que misturaram hidráulica na categoria Água & Gás. A lista final extraída para água tem seis itens de galão, e para gás 15 itens; conferir descrições e aceitação no CSV antes de carregar.
