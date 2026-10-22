# Diagnóstico estrutural e visual das áreas VemGO

## Estado antes do primeiro incremento compartilhado

- O único layout do App Router era `app/layout.tsx`, responsável por `html`, `body`, fontes e estilos globais. Não havia layouts aninhados para áreas autenticadas.
- A área do cliente vive em `/cliente/**`. A página inicial `/cliente` já tinha cabeçalho sticky e menu móvel próprio; as páginas internas usavam cabeçalhos independentes ou não tinham navegação comum.
- A área profissional vive em `/profissional/**`. A home já tinha cabeçalho/menu próprio e as páginas internas tinham cabeçalhos e fluxos independentes.
- O VemGO Control vive em `/controle/**`; `/controle` tem um painel administrativo completo, menu próprio e modais; `/controle/profissionais` tem tela de moderação separada.
- `/admin/login` fica fora do segmento `/controle`. O onboarding profissional (`/cadastro-profissional/**`), `/identidade` e `/meu-perfil` também estão fora dos layouts das áreas.
- `app/globals.css` já define tokens escuros, verdes, laranjas e azuis. `components/ui/` já contém botão, campos, card, badge, spinner e progresso; o uso está distribuído e várias páginas também têm classes próprias.
- Os cabeçalhos existentes mantêm ações importantes como menu, perfil, sair, região e notificações. Substituí-los integralmente arriscaria remover funcionalidades.

## Primeiro incremento entregue

- Adicionados layouts aninhados para `/cliente/**`, `/profissional/**` e `/controle/**` que usam o componente compartilhado `components/vemgo/PortalLayout.tsx`.
- O componente fornece uma barra fixa acessível, navegação horizontal responsiva e tema por área: verde, laranja e azul. Os cabeçalhos e menus existentes permanecem dentro das páginas para conservar suas ações atuais.
- As páginas existentes com cabeçalho sticky passam a ficar abaixo da barra fixa.
- A barra compartilhada usa `z-40`, abaixo dos cabeçalhos existentes `z-50` e das gavetas/modais `z-50` ou superiores, para manter as ações já presentes acessíveis.
- Os componentes UI agora têm variante azul de botão, cores temáticas para campos, cards, progresso e spinner. Foi criado `DataTable` reutilizável, `Dialog` com `<dialog>` nativo e `PageState` para carregamento/erro/vazio. `Dialog` já foi integrado aos dois diálogos administrativos; `PageState` foi integrado às cargas e lista vazia de endereços do cliente.

## Autenticação e proteção de rota

As páginas continuam usando redirecionamento no cliente e consultas ao Supabase em vários padrões. Os novos layouts são somente apresentação e não declaram proteção no servidor. Não foi introduzido Proxy nem DAL: a autorização real continua dependendo das verificações existentes e, principalmente, de RLS/RPCs no banco. Próxima etapa é inventariar guards por rota e padronizar o redirecionamento de sessão sem tratar o layout client-side como controle de segurança. O login administrativo `/admin/login` e o onboarding requerem desenho próprio antes de serem movidos para layouts.

## Próximas fatias de UI

1. Conferir as três barras fixas em viewport móvel e desktop e ajustar cabeçalhos sticky sobrepostos, sem remover ações existentes.
2. Migrar gradualmente cabeçalhos redundantes para slots/ações do layout compartilhado, começando por telas simples; validar cada rota antes de avançar.
3. Reutilizar `DataTable`, `Dialog`, `PageState` e variantes de UI em mais telas, corrigindo acessibilidade e estados reais sem reescrever fluxos.
4. Padronizar redirecionamentos por sessão/role com autorização de dados mantida em RPC/RLS e uma verificação no servidor apropriada à integração SSR do Supabase.
5. Só incluir `/cadastro-profissional/**`, `/identidade`, `/meu-perfil` e `/admin/login` em shells compartilhados depois de decidir seu contexto de área e estados públicos.
6. Tornar consistente a atualização de endereço principal: o fluxo atual usa duas escritas separadas e pode deixar zero endereço principal se a segunda falhar. Não foi alterado nesta fatia visual.

## Auditoria das rotas fora dos três portais — 20/10/2026

| Rotas | Contexto observado | Shell apropriado | Estado/decisão |
|---|---|---|---|
| `/cadastro-profissional/**` | Onboarding em etapas, com progresso e ações de voltar/avançar; já usa identidade laranja. | Wrapper de onboarding profissional, com marca, largura/área acessível e progresso consistente; sem navegação autenticada fixa, para não competir com o wizard. | Não transferida para `PortalLayout`. Progresso e cabeçalhos continuam repetidos entre etapas; componente compartilhado é próximo incremento. Sessão é checada por página em parte do fluxo. |
| `/admin/login` | Login público independente; a página verifica `user_type=admin` e `status=active` após autenticar. Já usa acento azul. | Sem shell/navegação autenticada. Manter formulário isolado e identidade Control azul. | Tema coerente; proteção no navegador após login não substitui autorização de servidor/RLS/RPC. |
| `/identidade` | Consulta de verificação de identidade para usuário autenticado; redireciona sem sessão; possui ligação para retomar etapa profissional. | Experiência específica de verificação, sem menu de portal enquanto o status/papel pode ainda não estar resolvido. | O código define o acento como laranja (`#f97316`) e usa o tema semântico profissional, sem cabeçalho fixo. A rota não verifica `user_type`; a associação ao fluxo profissional vem da ligação de retorno/onboarding. Nenhum link interno de entrada foi encontrado na auditoria. |
| `/meu-perfil` | Formulário de conta compartilhado por cliente e profissional; identifica tipo do perfil e oferece retorno específico. | Conteúdo universal de conta. Navegação deve ser decidida após ler o perfil de sessão no cliente ou reorganizar como rota interna de cada área. | Fora dos layouts; o acento muda para verde/laranja conforme `user_type` carregado, sem barra duplicada. `/profissional/perfil` já existe e o link de mudança de e-mail direciona de volta a `/meu-perfil`; reconciliar os dois fluxos antes de mover conteúdo. |

### Cabeçalho, acessibilidade e inspeção visual

- O `PortalLayout` mantém navegação fixa no topo, link de salto e alvo focalizável; os offsets de cabeçalhos de página estão em `app/globals.css`. A barra está em `z-40`; há páginas com cabeçalho `z-50`, portanto a ordem pode se inverter ao rolar e requer teste nas rotas reais.
- Nav horizontal rola em telas estreitas. Isso não comprova que todos os links e ações tenham boa usabilidade mobile, nem que os diálogos/telas sem portal estejam corretamente espaçados.
- A tentativa de abrir visualmente áreas protegidas deve usar sessão de teste já existente e ambiente local isolado; não usar credenciais reais nem realizar gravações de formulário. O build de produção permite inspeção de páginas públicas sem conectar banco.
- O build local iniciou em `127.0.0.1:3100` e ficou pronto, mas nenhuma página foi observada. A ferramenta de controle do Windows interrompeu a captura antes da navegação porque não conseguiu determinar com confiança a URL atual do Edge para aplicar sua política. O servidor local foi encerrado sem abrir formulários ou enviar dados. Portanto, responsividade, contraste, foco, cabeçalho sticky e diálogos seguem sem validação visual real.
- O `PortalLayout` é apresentação e cliente; não é uma barreira de autorização. Manter `RLS`, RPCs autorizadas e verificação de sessão/role adequada no servidor como critérios separados.
