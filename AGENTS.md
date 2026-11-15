# Convenções de desenvolvimento OTO

## Contexto e fontes

- Use a skill [continuar-oto](.agents/skills/continuar-oto/SKILL.md) para retomar incrementos.
- Consulte [docs/plano](docs/plano/README.md), a parte pertinente e suas dependências.
  Planos não comprovam implementação nem aceite do OTO: confira o código e os testes.
- Consulte obrigatoriamente [docs/planilhas](docs/planilhas/README.md) e as fontes da parte.
  Para parser, formulário ou cálculo, inspecione também o ODS/XLSX correspondente.
- O [schema Prisma](apps/backend/prisma/schema.prisma) representa o MER implementado.
  Evolua por migrations incrementais; preserve vigências, versões e auditoria.
- Preserve as planilhas originais e seus hashes. Use [fixtures/oto](fixtures/oto/README.md)
  para demonstração e testes; não extrair dados pessoais remanescentes dos esqueletos.
- Dados fictícios e fórmulas demonstrativas não são metodologia homologada do OTO.
  Registre regras pendentes e avance somente nas partes independentes delas.

## Código compartilhado e TypeScript

- Use **TypeScript 6** do workspace para checagem e compilação dos apps e do common.
  Backend usa o Nest CLI para build e watch, preservando decorators e metadata.
  O override do workspace mantém o compilador interno do CLI na mesma versão.
- Centralize constantes e contratos de API reutilizados por front e back em
  [common](common/README.md), pacote pnpm `@ssc0536/common`.
- Importe somente pela superfície pública `@ssc0536/common`, exportada em `common/src/index.ts`.
  Não copie contratos entre apps nem importe fontes internas de um app no outro.
- Organize `common/src` por domínio: `api/` para convenções HTTP transversais,
  `health/` para saúde e novas pastas com o nome do domínio conforme necessário.
  Dentro do domínio use `<assunto>.types.ts`, `<assunto>.constants.ts` e
  `<assunto>.validators.ts`; cada arquivo deve ter uma responsabilidade delimitada.
- Cada domínio tem `index.ts` com exports explícitos; a raiz apenas reúne a API pública.
  Use `export type` para tipos e imports relativos diretos entre arquivos internos,
  sem importar o barrel da raiz ou criar dependências circulares entre domínios.
- Não crie arquivos globais acumuladores (`constants.ts`, `contracts.ts`, `utils.ts`)
  nem pastas vazias para funcionalidades futuras. Código usado por só um app fica nele.
- Testes ficam em `common/test/<dominio>/`, espelhando os assuntos de `src`;
  `common/test/exports.test.mjs` verifica a superfície pública ESM/CommonJS.
- Common contém tipos, constantes e validações portáveis. Não depende de React, Nest,
  Prisma, DOM ou APIs exclusivas do Node. DTOs com decorators e acesso a dados ficam no backend.
- Tipos não validam JSON em runtime: mantenha validação no limite HTTP e no servidor.
  Ao alterar contratos, atualize consumidores, testes e documentação juntos.
- Preserve exports ESM e CommonJS e teste ambos. Rode build do common antes de comandos
  individuais dos apps; instalação, scripts globais e Docker já fazem isso.

## Contratos de API

- Use REST sob `/api`, recursos no plural em português e segmentos compostos em kebab-case
  (ex.: `/api/empreendimentos`, `/api/empreendimentos/:id/inventarios`).
- Campos JSON e parâmetros de consulta usam camelCase. Banco mantém o mapeamento snake_case
  do Prisma; não expor nomes de colunas nem modelos Prisma diretamente como contrato público.
- Defina DTOs de entrada e saída explícitos. Valide entradas no servidor com whitelist;
  documente obrigatoriedade, unidades, limites e exemplos fictícios junto ao endpoint.
- Resposta de sucesso de negócio: `{ "data": ... }`. Toda coleção aceita os parâmetros OData
  `$filter`, `$orderby`, `$top` (padrão 20, máximo 100), `$skip` e `$count`, descritos em
  [docs/contratos/odata.md](docs/contratos/odata.md), e responde
  `{ "data": [], "meta": { "top": 20, "skip": 0, "total": 0 } }` (`total` com `$count=true`).
  Os campos filtráveis são as colunas devolvidas na linha e vêm do esquema do recurso no common;
  a ordenação é sempre estável. `page`, `pageSize` e `meta.page/pageSize/totalPages` não existem
  mais: parâmetros fora do padrão OData retornam 400.
- Erros de negócio seguem `{ "error": { "code": "CODIGO_ESTAVEL", "message": "Mensagem legível", "details": [] } }`.
  `details` é opcional; validações por campo usam objetos `{ "field": "nome", "message": "..." }`.
  Acrescente `requestId` quando houver correlação implementada. Não enviar stack trace ou SQL.
- Use os status HTTP: 200 consulta/atualização, 201 criação, 204 exclusão sem corpo,
  400 entrada inválida, 401 sem autenticação, 403 sem permissão, 404 recurso não encontrado,
  409 conflito/duplicidade e 503 dependência indisponível. Não representar falha como HTTP 200.
- Datas sem hora usam `YYYY-MM-DD`; timestamps usam ISO 8601 em UTC. Percentuais devem ter
  escala documentada; decimais monetários/precisos são strings, sem perda por ponto flutuante.
  Diferencie null, zero e ausência. Exemplos e contratos devem refletir essa distinção.
- Mantenha frontend, testes e documentação sincronizados com o contrato. Mudanças incompatíveis
  exigem migração explícita; não introduzir outro envelope por preferência de um módulo.
- `/api/health` é um contrato operacional existente, sem envelope, usado pelo Docker.
  Preserve sua forma atual e os testes; as convenções acima orientam os endpoints de negócio.
- Autoria vem da sessão; IDs no payload não provam acesso. Aplique escopo por vínculo ativo
  também em consultas, exportações e integrações de BI.

## Frontend

- Siga a organização descrita no [guia do frontend](apps/frontend/README.md).
  As pastas de `src` são `pages`, `services`, `utils`, `components`, `layout` e `hooks`.
- Páginas ficam em `pages/<pagina>/index.tsx`, com composição declarativa. Hooks de
  orquestração exclusivos ficam em `hooks.ts` ao lado da página; tipos locais em
  `types.ts` somente quando compartilhados entre arquivos daquela página.
- Componentes específicos ficam em `pages/<pagina>/components/<componente>/index.tsx`.
  Componentes reutilizados ficam em `components/<componente>/index.tsx`; preserve
  a estrutura gerada dos primitivos em `components/ui`. Pastas usam kebab-case;
  não criar arquivos de componente com nome PascalCase. `App.tsx` é a entrada de composição.
- `layout/<nome>/index.tsx` contém estruturas visuais compartilhadas (shell, cabeçalho,
  navegação e rodapé), sem chamadas HTTP ou regras de domínio.
- Serviços ficam em `services/<dominio>/index.ts`. Registre caminhos em
  `services/endpoints.ts` e use `apiClient` de `services/http`; somente essa camada
  de transporte usa `fetch`. Serviços codificam parâmetros, chamam HTTP e validam
  respostas usando contratos do common, sem decisões de interface.
- `utils` contém funções puras, sem hooks ou I/O. `hooks/use-<nome>.ts` contém somente
  hooks reutilizados; hooks locais permanecem nas páginas. Não criar `lib` genérico.
- Testes ficam junto à página, serviço ou componente correspondente. Preserve cancelamento,
  query keys estáveis e os estados de carregamento, erro, vazio e sucesso quando aplicáveis.

- Sempre use **Tailwind CSS** para estilos. Reutilize tokens do tema e classes utilitárias;
  evite CSS ad hoc e estilos inline, exceto valores dinâmicos que não possam ser expressos por classes.
- Priorize **shadcn/ui** e componentes já existentes em `apps/frontend/src/components/ui`.
  Adicione componentes com `pnpm --filter @ssc0536/frontend ui:add <componente>` quando adequado.
  Preserve semântica, foco, teclado e estados acessíveis ao compor os componentes.
- Sempre use **TanStack Form** (`@tanstack/react-form`) para formulários no frontend,
  incluindo valores, validação, erros, campos visitados e estado de submissão.
  Não duplique o estado dos campos com `useState` nem crie gerenciadores de formulário próprios.
- Crie componentes de input reutilizáveis em `components/<nome>/index.tsx` para facilitar
  a integração com TanStack Form. Componha os primitivos shadcn/ui existentes e preserve
  sua estrutura em `components/ui`; não repita a integração de campos em cada página.
- Os componentes de campo devem integrar valor, alteração e blur ao TanStack Form,
  oferecer label, descrição e erros acessíveis, e propagar `id`, `name`, `ref`,
  `disabled`, `required`, `autoComplete` e atributos ARIA quando aplicáveis.
  Mantenha regras específicas do domínio fora dos inputs reutilizáveis.
- Conecte a submissão do TanStack Form às mutations do React Query e aos serviços de
  domínio. Validação no formulário orienta o usuário; mantenha a validação no servidor.
- Sempre use **TanStack React Query** (`@tanstack/react-query`) para estado vindo do servidor:
  `useQuery` para leitura, `useMutation` para escrita e invalidação das query keys afetadas.
- Centralize o QueryClient no provider da aplicação. Query keys devem incluir filtros,
  período e identidade/escopo relevantes; limpe caches pertinentes ao encerrar/trocar sessão.
- Centralize chamadas HTTP em clientes/funções por domínio. `fetch` pode existir nessa camada,
  chamada pelas queries/mutations; não fazer requisições diretamente em componentes nem em
  `useEffect`, e não duplicar loading/error/data de servidor com useState.
- Propague AbortSignal às consultas, trate erros HTTP e configure retry deliberadamente.
  Estado puramente local fora dos formulários (modal, seleção) pode usar estado React normalmente.

## Massa fictícia, banco e testes

- O cenário compartilhado é `fixtures/oto/scenario.json`: IDs e datas determinísticos,
  e-mails `example.test` e situações de acesso, capacidade, pesquisas e respostas.
- Carregue com `pnpm db:seed`, explicitando um DATABASE_URL local cujo banco termine em
  `_dev` ou `_test`. A carga só inicia em base de domínio vazia; repetir o mesmo cenário é no-op.
  Não executar seed automaticamente na inicialização nem resetar banco para contornar bloqueios.
- Para testes de integração, use DATABASE_TEST_URL em banco exclusivo com nome `_test`.
  Migrations reais e PostGIS são necessários. Suíte ignorada não equivale a integração aprovada.
- Mantenha testes automatizados unitários tanto no **backend quanto no frontend**.
  Backend usa `node:test`/`node:assert`; frontend usa Vitest + Testing Library. Testes
  unitários não dependem de banco, API externa ou dados pessoais. Mockar I/O não dispensa
  testar regras e comportamento observável; não testar apenas detalhes internos.
- No frontend, testar interações, carregamento, erro, sucesso e invalidação de cache
  quando aplicável; fornecer QueryClient isolado por teste e sem retentativas automáticas.
- Faça testes das regras alteradas (parse, autorização, concorrência, vigências, cálculo),
  usando fixtures isoladas; não usar a massa compartilhada como prova de uma API ainda inexistente.

## Verificações e continuidade

- `pnpm validate:repo`: links locais, metadados da skill e hashes das planilhas.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `pnpm build`: verificações estáticas.
- `pnpm test`: testes HTTP/configuração e fixtures; com DATABASE_TEST_URL, inclui integração.
- `pnpm test:unit`: executa explicitamente as suítes unitárias de back e front na CI.
- `pnpm test:integration`: exige DATABASE_TEST_URL e executa as suítes de PostgreSQL/PostGIS.
- `pnpm db:validate`: valida o schema; `pnpm db:deploy` aplica migrations na base indicada.
- O CI executa essas verificações e testa com PostgreSQL/PostGIS isolado. Execute localmente
  as verificações pertinentes à mudança; para documentação, links/formatação são suficientes.
- Atualize o plano da parte com evidências e pendências. Não declarar homologação do OTO
  nem resultados de GitHub Actions que ainda não foram executados.
