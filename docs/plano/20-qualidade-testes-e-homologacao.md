# 20 — Qualidade contínua, testes e homologação

**Situação:** planejado; não implementado por este documento.

## Base técnica entregue

Há [workflow de CI](../../.github/workflows/ci.yml) com validação de referências, skill,
hashes de planilhas, formatação, lint, tipos, testes unitários separados de back/front,
build e integração com PostgreSQL/PostGIS migrado. `pnpm test:unit` usa node:test no backend
e Vitest/Testing Library no frontend; `pnpm test:integration` exige DATABASE_TEST_URL.
A [massa compartilhada](../../fixtures/oto/README.md) possui carga explícita, idempotente
e testes com rollback. As convenções estão em [AGENTS.md](../../AGENTS.md).

O arquivo de workflow está preparado para execução quando enviado ao GitHub; sua criação
não constitui evidência de uma execução remota nem homologação funcional do OTO.
As etapas de dados, autorização e cálculos de negócio continuam sendo implementadas e
testadas conforme cada parte, sem marcar este plano integralmente concluído.

**Rastreabilidade:** RF01–RF39; RNF01–RNF14; seção 9 do Plano v4.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Preservar os esqueletos originais e seus hashes. Gerar fixtures fictícias separadas, cobrindo o layout real, e validar os resultados esperados com o OTO. Não exigir dados pessoais para aceite funcional da POC.

## Objetivo e execução transversal

Definir evidência de qualidade para cada incremento, desde a primeira funcionalidade.
A numeração 20 não significa executar testes somente depois dos demais módulos.

## Preparação com a primeira entrega

- Atualizar a matriz de rastreabilidade dos documentos anteriores para RF/RNF da versão 4;
  conservar a origem de cada critério sem reutilizar IDs antigos com outro significado.
- Preparar CI com instalação pelo lockfile, geração Prisma, build, tipos, lint, formatação
  e testes pertinentes. Não marcar integração como aprovada quando a suíte foi ignorada
  por falta de `DATABASE_TEST_URL`.
- Criar banco PostgreSQL/PostGIS exclusivo de teste, executar migrations reais e garantir
  isolamento, limpeza controlada e proteção dos dados de desenvolvimento/produção.
- O frontend usa Vitest/Testing Library e o backend mantém `node:test`/`node:assert`,
  preservando os testes existentes. A exigência comum é executar testes unitários dos
  dois módulos na CI; não é necessário unificar os runners para testar os fluxos.

## Camadas de verificação

| Camada           | Evidências esperadas                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| Unidade          | Regras canônicas, validações, parse, conciliação, intervalos e fórmulas              |
| Integração       | Transações, FKs, auditoria, importação, recálculo e publicação consistente           |
| Fluxos completos | Login → inventário; importação → conferência; pesquisa → resposta → indicador        |
| Dados            | Layouts recebidos com fixtures fictícias e resultados esperados homologados pelo OTO |
| Acesso           | Matriz por perfil, tentativa de acessar outro empreendimento, exportação e BI        |
| Interface        | Teclado, estrutura semântica, contraste, responsividade, estados de erro e ausência  |
| Operação         | Migração, observação de falhas, restauração de backup e reinício dos serviços        |

## Homologação por incremento

Preparar roteiro com contexto, ação, resultado esperado, RF/RNF relacionado, evidência e
responsável do OTO. Demonstrar com amostra aprovada e registrar aceito, aceito com ressalva
ou rejeitado, além de pendências e correções. Relacionar a revisão do código e dos dados usada.

## Critério comum de pronto

- Backend, dados e interface necessários ao fluxo estão integrados; sem depender de mocks
  apresentados como integrações reais.
- Regras e decisões estão documentadas, migrations revisadas e acesso/auditoria testados.
- Testes relevantes passam com evidência, incluindo erros e casos de limite.
- O roteiro demonstra o resultado funcional; dependência externa não resolvida fica explícita.
- OTO valida metodologia e critérios de negócio aplicáveis; aprovação técnica da equipe
  não substitui a homologação de fórmulas/fontes pelo cliente.

## Conclusão da POC

Consolidar roteiro de ponta a ponta, testes não funcionais com limites previamente acordados,
registro de limitações e ata de validação final. Adesão dos empresários é acompanhada como
resultado operacional, sem atribuir ao software a garantia de participação de terceiros.

## Evidências da base técnica

- Frontend organizado em pages, services, utils, components, layout e hooks. A tela
  inicial usa hook local com React Query, serviço de saúde e transporte HTTP central.
  Os testes acompanham a página e o serviço; o guia do frontend e AGENTS.md registram
  o padrão para os próximos incrementos.

- TypeScript 6.0.3 explícito na raiz, frontend, backend e common. Build e watch do
  backend usam o Nest CLI, com override para o mesmo compilador. O lint usa
  typescript-eslint diretamente, sem pacote de isolamento.
- `common` organiza convenções HTTP em `src/api` e saúde em `src/health`, com arquivos
  por assunto/responsabilidade, exports explícitos e testes por domínio. O padrão está
  documentado no AGENTS.md e no README do pacote.
- `common` publica constantes e contratos em ESM e CommonJS. `/api/health` usa esse
  contrato em ambos os apps; a CI inclui os testes dos dois formatos.
- Verificados localmente: instalação com lockfile congelado, tipos, build, lint,
  formatação, referências/hashes, schema Prisma, 18 testes unitários e 8 de integração
  com PostgreSQL/PostGIS. Os três serviços Docker iniciaram saudáveis com TS 6;
  o modo nativo de watch do Nest compilou e serviu `/api/health` corretamente.
- Essas evidências validam a infraestrutura atual; não representam funcionalidades
  de negócio implementadas nem homologação pelo OTO. A execução remota da CI fica
  pendente até publicação das alterações.
