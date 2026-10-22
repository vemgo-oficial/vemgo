# Matching e pagamentos — estado verificado e plano de teste

Atualizado em 20/10/2026. Somente fontes locais e relatórios anteriores; sem acesso ao banco remoto nesta etapa.

## Matching atual

O ciclo de solicitação que a interface local realmente mostra é: `app/cliente/page.tsx` insere `requests` com cliente/serviço/endereço; chama `classify_request`; depois chama `match_request`. O lado profissional usa `get_professional_opportunities` e `respond_to_professional_opportunity`; aceitar uma oportunidade nesta função local pode criar ordem confirmada. Uma busca local não encontrou `get_client_request_matches` nem `select_professional_for_request` na aplicação cliente, então esse caminho alternativo de busca/seleção do cliente existe no snapshot, mas não tem ligação comprovada no frontend atual. Isso precisa ser reconciliado com o fluxo de aceite profissional antes de consolidar uma única política de seleção.

Na versão de `match_request` do snapshot de raiz (não comprovada como versão remota atual), o estado precisa ser `classified` e o pedido precisa ter serviço/endereço; são selecionados profissionais com serviço e preço ativos/vigentes, região de cidade/estado igual, `verification_status='approved'` e `service_status='active'`. A pontuação gravada é fixa em 100; não há `ORDER BY` nem limite de opções; `(request_id, professional_id)` é idempotente via chave única e `ON CONFLICT DO NOTHING`. A função só muda a solicitação para `matching` se inseriu pelo menos um match; quando não há candidato, fica `classified`. Essa função não verifica `auth.uid()`/titularidade, status ativo da conta, identidade verificada, disponibilidade, aceitação de chamadas ou lock do pedido. A migração P0 local propõe cobrir titularidade e elegibilidade, mas não foi executada.

O snapshot de raiz define a seleção com `FOR UPDATE` na linha da solicitação do titular e no match escolhido; confere status `matching`, match `pending`/`sent` e preço ativo. Cria o pedido `confirmed` sem criar `payments`; marca a opção escolhida `accepted`, cancela outros matches pendentes/enviados, avança `requests` para `matched` e tenta registrar auditoria. Como não há constraint única local sobre `orders.request_id`, a trava do pedido e a transição de status precisam ser demonstradas em dois processos concorrentes. A confirmação operacional não significa pagamento.

O relatório da fase zero registrou, a partir de leitura remota anterior, as mesmas lacunas de score fixo 100 e ausência de limite/ranking de três opções. Isso é observação histórica não revalidada; snapshots locais divergentes não comprovam comportamento instalado no banco.

### Estados e ciclo de vida observados no snapshot local

Os estados abaixo são constraints de `supabase-schema.sql` (snapshot rastreado e modificado, não autoritativo); não são uma máquina de estados aprovada nem uma fotografia atual do banco:

| Entidade | Valores aceitos no snapshot | Transições/efeitos observados | Lacuna a validar |
|---|---|---|---|
| `requests` | `pending`, `classified`, `matching`, `matched`, `scheduled`, `cancelled`, `expired`, `completed` | A criação do cliente chama classificador e matching; matching com pelo menos uma inserção passa a `matching`; seleção/aceite aprovado passa a `matched`. | Regras de cancelamento, expiração, reagendamento e conclusão não foram verificadas ponta a ponta. |
| `request_matches` | `pending`, `sent`, `accepted`, `declined`, `expired`, `cancelled` | RPC profissional recusa oportunidade pendente ou marca `declined`; aceite muda para `accepted`. RPC de seleção de cliente aceita `pending` ou `sent` e cancela outros `pending`/`sent`. | Divergência entre `pending` e `sent`, prazo/expiração, limite e ranking não estão definidos em fonte recuperada. |
| `orders` | `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `disputed` | Tanto aceite profissional quanto seleção do cliente podem criar `confirmed`; as funções consultadas não criam uma linha em `payments`. | Sem constraint única em `request_id`; confirmar fluxo e concorrência entre as duas RPCs. Política de cancelamento/disputa ausente. |
| `appointments` | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show` | Código das telas trata agendamento separadamente da ordem. | Não inferir transição automática entre pedido/ordem/agendamento sem testar as RPCs e o ciclo real. |
| `payments` | `pending`, `authorized`, `paid`, `failed`, `cancelled`, `refunded`, `partially_refunded` | O esquema tem provedor/referência e estados, mas nenhuma integração local foi comprovada. | Estado atual de cobrança, captura, cancelamento e refund não documentado como regra de produto. |
| `transactions` | tipos `charge`, `commission`, `payout`, `refund`, `adjustment`; status `pending`, `completed`, `failed`, `cancelled` | Tabelas/constraints de ledger existem no snapshot. | Sem taxa, cálculo, ordem atômica, conciliação ou provedor confirmado. |

O código UI pode filtrar/rotular oportunidades e agendamentos, mas isso não prova autorização no servidor. Respostas profissionais diretas para `request_matches` devem ser verificadas contra P0 (que remove UPDATE direto e deixa a operação em RPC); até existir banco isolado, não sabemos se a integração atual sobrevive aos novos grants/RLS.

### Testes reproduzíveis necessários em DB isolado

Preparar fixtures com dois clientes e pelo menos quatro profissionais, em estados distintos de identidade, aprovação, serviço, disponibilidade, aceitação de chamadas, preço e região. Usar UUID fixos isolados e transações revertidas.

| Propriedade | Teste positivo | Teste negativo / concorrente | Evidência a guardar |
|---|---|---|---|
| Titularidade | Cliente dono classifica pedido e obtém opções permitidas. | Outro cliente e sessão anônima não iniciam ou leem matching alheio. | SQLSTATE/retorno e nenhuma linha alterada. |
| Elegibilidade | Somente profissionais aptos e com serviço/região/preço válidos entram. | Identidade não verificada, profissional pendente/inativo, chamada recusada, preço inativo ou região incompatível ficam fora. | IDs retornados e atributos da fixture. |
| Limite e ordenação | Resultado respeita quantidade máxima explicitamente aprovada e ordem determinística por critérios existentes. | Empates preservam desempate estável; resultados extras não escapam do limite. | Conjunto ordenado repetido sob mesmos dados. |
| Idempotência | Repetir matching/seleção não duplica o conjunto nem pedido ativo. | Retry após erro ou timeout não confirma duas seleções. | Contagens antes/depois e chave única relevante. |
| Concorrência | Uma seleção válida cria a ordem esperada. | Duas sessões selecionam simultaneamente; apenas uma vence. Revogar elegibilidade durante a disputa não permite completar seleção obsoleta. | Duas conexões reais, locks/SQLSTATE, estado final único. |
| Ciclo de vida | Transições permitidas de `requests`, `request_matches` e `orders` são documentadas e aplicadas. | Transição fora de ordem ou por ator incorreto falha. | Tabela de transições baseada no esquema autoritativo e teste. |

No ponto atual, falta teste do cliente encontrar/listar/selecionar o profissional após o match; as RPCs de consulta e seleção não têm chamadas locais por nome. Confirmar se o caminho esperado é uma tela nova, a RPC de oportunidades ou outro código antes de fechar o fluxo.

Não assumi se o produto deve limitar a três profissionais, quais dimensões definem score, se a seleção confirma a contratação ou apenas reserva, nem prazos de expiração; essas regras não foram recuperadas de uma fonte confiável. Preservá-las como decisões pendentes evita codificar política comercial presumida.

## Pagamentos atuais

Os snapshots definem `payments.status` com os valores `pending`, `authorized`, `paid`, `failed`, `cancelled`, `refunded` e `partially_refunded`. `transactions.transaction_type` inclui `charge`, `commission`, `payout`, `refund` e `adjustment`. `payments` registra provedor e referência da cobrança, mas não há tabela de eventos/webhook no esquema local verificado. Os snapshots e a busca de código local não contêm integração de provedor demonstrável. Não foi recuperada escolha de gateway, comissão, quem absorve tarifas, momento do débito, calendário de repasse, política de reembolso ou disputa.

O histórico recuperado no chat **“Banco VemGO Água Gás”** (`6ac6e2c6-4bcc-83e9-84f4-62dce83d80c2`) traz a mensagem do usuário `3892ed91-89d6-4911-ae15-ee0f82c8d9ef`: sem orçamento aberto no início; o cliente deve ver o preço antes de contratar; chat/foto atendem dúvidas e peculiaridades. Uma mensagem do usuário no mesmo chat (`2e0835c2-cbf6-49a2-a797-1f63baafa8ac`) limita a parte de Água à entrega de galões e direciona serviços hidráulicos para Encanador; pede 15 serviços de gás. A resposta histórica mais recente sugere seis itens de galões e 15 itens de gás, mas permanece proposta de assistente. Isso não seleciona gateway nem define comissão, tarifas ou cronograma de repasse.

Esses valores são checks de esquema, não uma máquina de estados comprovada. Não se deve inferir que um pedido `confirmed` foi pago; a inspeção anterior do fluxo indica que seleção pode confirmar `orders` sem criar pagamento. Confirmar isso contra a fonte autoritativa antes de integrar cobranças.

### Especificação que falta antes de integrar qualquer provedor

1. **Provedor e recebedor:** nome do gateway, modelo de conta/conexão e quem é o merchant of record.
2. **Máquina de estados:** origem e destino permitidos entre estados de `payments`; relação explícita com estados de pedido e regras de cancelamento/expiração.
3. **Taxas e repasses:** comissão VemGO, tarifas do gateway, base de cálculo, retenções, prazo/frequência de payout e tratamento de saldo negativo.
4. **Webhooks:** verificação de assinatura, rotação de segredo, deduplicação por ID do evento, tolerância a reordenação, retries e auditoria.
5. **Reembolsos e disputas:** parcial/total, limites acumulados, estorno da comissão e do payout, quem decide, evidência e conciliação.
6. **Idempotência e ledger:** chave por operação no servidor, unicidade por evento/operação, transações atômicas de ledger e reconciliação com o provedor.
7. **Autorização:** cliente não escreve status, valor, comissão ou payout diretamente; funções privilegiadas validam titularidade e origem assinada.

### Testes sem dinheiro real

Com um sandbox local/oficial do provedor escolhido, testar eventos de sucesso, falha, repetição, reordenação, assinatura inválida, reembolso parcial/total, duplicidade de webhook, timeout entre captura e persistência, e reconciliação. Sem credenciais sandbox aprovadas e regras comerciais registradas, manter apenas testes de contrato/fixture, sem transações reais.
