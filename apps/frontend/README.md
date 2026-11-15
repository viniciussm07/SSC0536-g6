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
  App.tsx                  # Composição das páginas; futura integração de rotas
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

## Limites e imports

Use `@/pages`, `@/services`, `@/utils`, `@/components`, `@/layout` e `@/hooks` para
imports entre áreas; dentro da mesma página/domínio, prefira caminhos relativos.
Não crie barrels globais acumulando todos os serviços/componentes.

A direção usual é `página → hook → serviço de domínio → transporte HTTP`.
Utils e serviços não importam páginas, componentes ou layouts. Hooks compartilhados
não dependem de páginas. Código específico de um app permanece nele; apenas constantes,
contratos e validações portáveis compartilhados pelos dois apps pertencem ao common.

A estrutura de diretórios não cria navegação automaticamente. Ao adicionar rotas,
integre a página à composição real da aplicação, em vez de apenas criar o arquivo.

## Verificar

Na raiz do repositório, execute `pnpm typecheck`, `pnpm build`, `pnpm lint` e
`pnpm --filter @ssc0536/frontend test:unit`. `pnpm format:check` confere o padrão de escrita.
