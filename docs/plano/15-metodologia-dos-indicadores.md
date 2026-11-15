# 15 — Metodologia, fórmulas e dados de referência dos indicadores

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF10–RF16 e RF35; seção 3.5 e seção 9.4.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md), [01](01-contrato-de-dados-e-regras.md), [10](10-periodos-e-calendario.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

A nota de TABULAÇÃO!B97 no Consolidado atribui o ajuste de day use à Pesquisa de Demanda 2024, não fornecida no conjunto. Solicitar definição e vigência desse parâmetro, sem exigir registros pessoais. Validar as fórmulas com massa fictícia e saídas esperadas aprovadas pelo OTO.

## Objetivo

Formalizar as definições de cada indicador antes de automatizar o cálculo.
Esta especificação pode avançar em paralelo aos fluxos, após liberação dos pré-requisitos.

## Ficha obrigatória por indicador

Registrar código, nome, unidade, versão da fórmula, entradas, fontes/colunas, período,
população elegível, respondentes usados, recorte, vigência da capacidade, método de
agregação, parâmetros, arredondamento e exemplo com resultado oficial validado pelo OTO.

## Regras a validar

- Ocupação: unidade de resposta (UH/leitos), média aritmética ou ponderada, peso correto,
  denominador, não respondentes e diferença entre população total e amostra respondente.
- Expectativa: agregação das respostas de intenção para período futuro; não é previsão
  estatística. Comparação com Consolidado deve preservar a população/metodologia usada.
- Capacidade: definição de disponível versus cadastrada e efeito de encerramento,
  entrada de estabelecimentos e alterações no meio do período.
- Fluxo/pernoites: duração inclusiva, ocupação, leitos, day use, RHC e demais fatores
  efetivamente utilizados pelo OTO; não inventar um multiplicador genérico.
- Diária: fontes selecionadas, pesos, data da coleta versus estadia, recortes de semana
  e fim de semana e tratamento de outliers/ausências; escopo condicionado à fonte aprovada.
- Variação: períodos comparáveis, diferença absoluta/percentual, base zero e dados ausentes.
- Sazonalidade: frequência, série disponível, mudanças metodológicas e comparabilidade.

## Dados e testes previstos

- Vincular a metodologia a `IndicadorDefinicao`, `ParametroCalculo` e recortes aprovados.
  Planejar versões imutáveis de fórmula/parâmetros: alterar uma linha usada em resultado
  antigo não pode eliminar sua reprodutibilidade.
- Construir massa fictícia de referência com o layout recebido e entradas/saídas esperadas
  homologadas pelo OTO. Não exigir dados pessoais de um período real fechado.
- Registrar tolerância de comparação aprovada, sem presumir equivalência com qualquer média.
- Preparar casos de limite: nenhum respondente, capacidade zero, base zero, mês bissexto,
  troca de capacidade e amostra parcial.

## Critérios de aceite

Cada indicador liberado possui ficha aprovada e casos reproduzíveis. Indicador sem fonte,
fórmula ou resultado de referência continua bloqueado. A ausência de dados deve aparecer
como indisponibilidade ou estimativa explicitada, nunca como valor zero fabricado.
