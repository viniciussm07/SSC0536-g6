# 20 — Qualidade contínua, testes e homologação

**Situação:** planejado; não implementado por este documento.

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
- Plano v4 propõe Vitest; a base atual usa `node:test` no backend. Registrar decisão de
  padronização com a equipe, preservando os testes úteis e evitando migrar runner sem benefício.

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
