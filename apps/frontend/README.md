# Organização do frontend

A organização segue o padrão por página e domínio da referência Mercadin, adaptado
para React web, Vite, Tailwind CSS e shadcn/ui. Recursos específicos de React Native,
Expo e NativeWind não se aplicam a este projeto.

```text
src/
  pages/
    home/
      index.tsx
      hooks.ts
      home.test.tsx
  services/
    endpoints.ts
    query-client.ts
    http/
      index.ts
    health/
      index.ts
      health.test.ts
  utils/
    cn.ts
  components/
    ui/                    # Primitivos shadcn
  layout/
    app-layout/
      index.tsx
  hooks/                   # Hooks compartilhados quando houver reutilização
  test/
    setup.ts               # Infraestrutura dos testes
  router.tsx               # Rotas (TanStack Router, por código) e tipos registrados
  App.tsx                  # RouterProvider; main.tsx inicializa providers
  main.tsx                 # Inicialização e providers
  index.css                # Tailwind e tokens do tema
```

## Responsabilidades

| Pasta        | Conteúdo                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------- |
| `pages`      | Composição das telas, hooks de orquestração e componentes exclusivos da página.             |
| `services`   | Transporte HTTP, registro de endpoints, serviços por domínio e configuração do QueryClient. |
| `utils`      | Funções puras reutilizáveis, sem React, rede ou efeitos colaterais.                         |
| `components` | Componentes visuais compartilhados; priorizar os primitivos shadcn em `components/ui`.      |
| `layout`     | Estruturas visuais compartilhadas, como shell, cabeçalho, navegação e rodapé.               |
| `hooks`      | Hooks utilizados por mais de uma página/componente; hooks específicos ficam junto à página. |

## Criar uma funcionalidade

1. Crie `pages/<pagina>/index.tsx`, exportando uma função com nome descritivo,
   como `EmpreendimentosPage`. Use pastas em kebab-case.
2. Mantenha query/state da página em `hooks.ts` ao lado dela. Exporte tipos em
   `types.ts` somente quando usados por mais de um arquivo local.
3. Componentes exclusivos ficam em `pages/<pagina>/components/<componente>/index.tsx`.
   Quando houver reutilização real, mova para `components/<componente>/index.tsx`.
   Evite arquivos `PascalCase.tsx`; os primitivos gerados em `components/ui` mantêm
   a estrutura do shadcn. Não crie pastas ou camadas sem código que as utilize.
4. Registre caminhos em `services/endpoints.ts`. Defina chamadas em
   `services/<dominio>/index.ts` usando `apiClient` de `services/http`.
   Centralize `fetch` no transporte. Codifique parâmetros de rota/query e encaminhe
   `AbortSignal`. Contratos compartilhados vêm de `@ssc0536/common`; tipos não
   dispensam a validação do JSON recebido. Não duplique contratos nos serviços.
5. Use React Query no hook da página para todo estado de servidor. Defina query keys
   com `as const`, incluindo filtros e escopo; use `enabled` para requisitos mínimos.
   Trate mutations e invalidação nas funcionalidades que as exigirem. Mantenha estado
   puramente local no React e use `useMemo` apenas quando houver benefício concreto.
6. Componha a página de forma declarativa, usando `layout` para a estrutura comum,
   Tailwind para estilos e shadcn para UI. Trate carregamento, erro, vazio e sucesso
   conforme o fluxo. Layouts não consultam serviços de domínio.
7. Coloque testes junto à página, serviço ou componente, com nomes `*.test.ts(x)`.
   Forneça QueryClient isolado por teste. Teste comportamento observável e cancelamento
   quando aplicável; `src/test/setup.ts` é reservado à configuração comum.

## Formulários

Use TanStack Form por meio de `hooks/use-app-form.ts`. O hook registra o input
reutilizável de `components/form-input`: componha `form.AppField` e `field.Input`
com label e descrição, mantendo validadores de domínio no formulário/página. O campo
integra valor, alteração, blur, erros e metadados, associa descrições/erros por ARIA e
encaminha atributos nativos e ref ao primitivo shadcn/ui. Não gerencie valores dos
campos com useState nem sobrescreva os handlers do TanStack Form no input.

A submissão deve aguardar `mutateAsync` da mutation React Query correspondente.
Assine `isSubmitting` com `form.Subscribe` para bloquear campos e envios duplicados
durante a operação. Login e ativação em `pages/acesso/components` exemplificam a
composição, validação e limpeza de segredos após resposta ou troca de formulário.
O reset do login preserva o e-mail e os valores padrão com `keepDefaultValues`.
Validação do servidor continua sendo obrigatória.

## Limites e imports

Use `@/pages`, `@/services`, `@/utils`, `@/components`, `@/layout` e `@/hooks` para
imports entre áreas; dentro da mesma página/domínio, prefira caminhos relativos.
Não crie barrels globais acumulando todos os serviços/componentes.

A direção usual é `página → hook → serviço de domínio → transporte HTTP`.
Utils e serviços não importam páginas, componentes ou layouts. Hooks compartilhados
não dependem de páginas. Código específico de um app permanece nele; apenas constantes,
contratos e validações portáveis compartilhados pelos dois apps pertencem ao common.

## Rotas e navegação

As rotas usam **TanStack Router** com definição por código em `src/router.tsx`
(sem geração de árvore). A estrutura de `pages/` não cria navegação sozinha: ao
adicionar uma página, registre a rota em `router.tsx` e, se for item de menu, em
`utils/navegacao.ts` (caminho, rótulo e recurso exigido).

| Caminho          | Página                 | Acesso                                                                                          |
| ---------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `/entrar`        | `pages/acesso`         | Pública (login e ativação)                                                                      |
| `/`              | `pages/inicio`         | Autenticada: o empreendimento selecionado ou, sem contexto, a visão geral (`pages/visao-geral`) |
| `/indicadores`   | `pages/indicadores`    | Permissão `indicadores:consultar`, só na visão geral                                            |
| `/administracao` | `pages/administracao`  | Permissão `contas:consultar`, só na visão geral                                                 |
| qualquer outro   | `pages/nao-encontrada` | Página não encontrada                                                                           |

`pages/area-autenticada` é a rota de layout das áreas autenticadas: recupera a
sessão (React Query), redireciona para `/entrar` sem sessão, consulta as permissões
e renderiza o `AppShell` (`layout/app-header`, `app-nav`, `app-footer`). As páginas
leem a sessão e as permissões com `useContextoAutenticado`/`useAcessoAtual`.
`components/rota-protegida` mostra "Acesso negado" sem permissão.

**Contexto de entidade.** `components/contexto-entidade` guarda o empreendimento selecionado
(`useContextoEntidade`). No canto direito do cabeçalho há um único botão
(`pages/area-autenticada/components/menu-usuario`): o contexto (empreendimento ou "Visão geral
do OTO") em destaque e o nome da pessoa em segundo plano. Seu dropdown mostra e-mail, perfil,
a seleção de entidade (`seletor-contexto`: busca e lista infinita com `useInfiniteQuery`;
só para quem pode escolher) e a ação Sair. O menu
depende do contexto: **com empreendimento**, a saída para a visão geral é um botão "←" ao lado do nome da empresa, na barra do botão da
conta (não existe para o empresário; a opção "Visão geral do OTO" também segue no dropdown), e o
menu lateral traz só a seção dele (o item "Empreendimento" é a
página inicial `/`) e as áreas da visão geral redirecionam para `/`; **sem empreendimento**
(visão geral do OTO), aparecem Início, Indicadores e Administração. Os serviços de dados de
uma entidade enviam o cabeçalho `x-identification` com o ID (ver
[contrato de acesso](../../docs/contratos/acesso.md)). Query keys de dados da entidade
incluem o ID dela. Esses controles
orientam a interface; o servidor continua autorizando cada requisição.

Em testes, use `renderApp(caminho)` de `src/test/render-app.tsx` (histórico em memória
e QueryClient isolado) ou `renderComContexto` para uma página sem roteador.

## Verificar

Na raiz do repositório, execute `pnpm typecheck`, `pnpm build`, `pnpm lint` e
`pnpm --filter @ssc0536/frontend test:unit`. `pnpm format:check` confere o padrão de escrita.
