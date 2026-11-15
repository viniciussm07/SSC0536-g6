# Interface OTO — primeira entrega visual

## Referência e recorte

A referência é o [protótipo HTML v5](../referencias/interface-oto/prototipo-oto-v5-final.html)
fornecido pelo usuário e preservado com hash no [catálogo da interface](../referencias/interface-oto/README.md). Seu conteúdo
orienta a apresentação; perfis simulados, dados, fórmulas e confirmações do protótipo
não substituem contratos nem regras aprovadas. O incremento aplica a identidade aos
fluxos existentes, preservando rotas, permissões, contexto e persistência.

## Implementado

- Tokens Tailwind: azul termal, CTA laranja com texto escuro para contraste, fundo
  off-white, estados, raios de 14/9 px e sombras. Inter e Roboto servidas localmente,
  com `font-display: swap`, fallback de sistema e licenças OFL em `public/fonts`.
- Brasão extraído da imagem incorporada no HTML, sem alterar o arquivo recebido.
  O favicon usa a assinatura textual OTO em azul, em SVG local.
- Login em duas colunas acima de 1024 px; acesso e definição de senha reais preservados.
  Sem seletor de perfil, números demonstrativos ou notificações simuladas.
- Cabeçalho de 66 px e lateral de 262 px. Até 1024 px, navegação em diálogo Radix:
  foco contido, Escape, fechamento ao navegar e retorno ao acionador. Ao ampliar para
  desktop, o diálogo fecha. Atalho para o conteúdo e região de tabela focável.
- Visão geral, ficha, capacidade vigente, edição cadastral, inventário versionado,
  administração, catálogos, pré-visualização e indicadores usam o tema comum.
- Grades mantêm filtros por coluna, ordenação, paginação OData e ações autorizadas.
  Formulários mantêm TanStack Form e mutations React Query. Cadastro e inventário
  continuam com submissões independentes; zero, ausência e não se aplica continuam distintos.
- Não houve alteração de endpoints, contratos públicos, schema ou migrations.

## Verificação local

- `pnpm validate:repo`: referências, skill e hashes das sete planilhas preservados.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` e `pnpm test:unit` aprovados.
- Testes: common 157; backend 33 HTTP/regras + 6 fixtures; frontend 116 em 22 arquivos.
  Incluem login, troca de contexto, permissões, logout, cache, edição cadastral e versões
  do inventário. Dois novos casos cobrem Escape/retorno de foco e navegação no menu.
- Chrome com HTTP simulado e dados fictícios: login, início, empreendimentos,
  administração, catálogos, indicadores, ficha, edição, nova versão e detalhe histórico nas larguras 390, 768, 1024 e
  1440 px. Capturas e verificação de ausência de overflow global; foco contido no menu,
  Escape, retorno ao acionador e fechamento ao ampliar para desktop, sem erros JavaScript.
  Comparação com capturas do HTML original de login e inventário nas quatro larguras.
- Build emite aviso de tamanho do bundle JavaScript. Divisão por rotas fica como
  melhoria de desempenho; o aviso não é apresentado como falha nem como meta homologada.

A revisão visual usa mocks explicitamente; não constitui teste de integração com banco.
Nenhuma nova execução de PostgreSQL/PostGIS ou GitHub Actions é declarada por esta entrega.
O aceite visual pelo OTO permanece pendente.

## Continuidade

1. Auditoria consultável: [parte 07](07-auditoria-de-alteracoes.md).
2. Importação e conciliação: [parte 08](08-importacao-upload-leitura-e-parse.md) e
   [parte 09](09-importacao-conciliacao-e-persistencia.md).
3. Gestão e resposta de pesquisas: partes 10–13, com formulário e políticas aprovados.
4. KPIs, gráficos, comparações e boletins: partes 15–18, após metodologia, cobertura,
   revisões e decisão sobre Looker Studio. A consulta atual não calcula agregados a
   partir de páginas parciais da coleção.
5. Preferências e distribuição: [parte 14](14-notificacoes-e-preferencias-de-boletim.md).

Inspecionar fontes ODS/XLSX pertinentes antes de implementar novos campos, parsers ou
cálculos. Recursos futuros entram com API e autorização reais; não recebem ações de
sucesso fictício nesta entrega.
