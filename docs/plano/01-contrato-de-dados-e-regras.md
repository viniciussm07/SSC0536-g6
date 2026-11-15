# 01 — Contrato de dados, regras e recorte da primeira versão

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF03, RF05–RF08, RF22, RF35; RNF09 e RNF12; seção 3.5.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Mapear as estruturas recebidas e seus significados. Usar exemplos fictícios para preenchimento; não aguardar dados pessoais reais.

## Objetivo

Transformar as fontes recebidas em um contrato de dados canônico compartilhado por
formulários, importação, APIs e cálculos. A referência de RF/RNF deste plano é a versão 4
entregue pelo usuário; documentos anteriores têm numeração diferente e precisam de reconciliação.

## Decisões a registrar

- Para cada campo: origem (arquivo/aba/coluna), nome canônico, entidade, tipo, unidade,
  domínio permitido, nulabilidade, obrigatoriedade por contexto e exemplo fictício baseado no layout recebido.
- Distinguir zero, falso, vazio, desconhecido e não se aplica; não converter todos em zero/null.
- Definir identificação estável do empreendimento; CNPJ não é chave única aprovada.
  Conciliar ID legado, nome, endereço e confirmação humana quando houver ambiguidade.
- Validar tipo de hospedagem versus categoria de indicador, inclusão de empreendimentos
  encerrados e diferença entre correção cadastral e mudança real de capacidade.
- Definir fuso operacional, datas sem horário, percentuais (0–1 ou 0–100), arredondamento
  somente na apresentação e interpretação dos intervalos de vigência.
- Definir tratamento de escolhas e quantidades, campos de texto livres e valores legados.

## Trabalho previsto

1. Mapear as colunas reais para o schema existente e registrar campos sem correspondência.
2. Produzir uma matriz fonte → transformação → destino → validação → exemplo de teste.
3. Definir validações de domínio reutilizáveis entre importação e entrada manual; validar
   no servidor mesmo quando houver orientação imediata no frontend.
4. Rever as lacunas do schema por funcionalidade e preparar migrations incrementais:
   credenciais/sessões, permissões, lotes de importação, versões de formulário,
   preferências de boletim e estado/versionamento de cálculos não estão completos na base.
5. Registrar cada nova regra com versão, responsável pela validação e impacto histórico.
6. Manter decisões pendentes explícitas, com impacto e funcionalidade bloqueada.

## Entregáveis

Dicionário canônico, matriz de transformação, catálogo de regras, lista de migrations
necessárias e recorte aprovado do primeiro incremento. Não criar migrations de todas as
lacunas antecipadamente: cada parte entrega apenas as mudanças necessárias ao seu fluxo.

## Critérios de aceite

- Cada campo inicial é rastreável a uma fonte aprovada ou a uma decisão de produto registrada.
- Mesma entrada manual e importada produz o mesmo valor canônico.
- Casos de zero, não se aplica e desconhecido têm resultados distintos e testes previstos.
- Não há regra de cálculo, unicidade de CNPJ ou público de dashboard presumidos como aprovados.
