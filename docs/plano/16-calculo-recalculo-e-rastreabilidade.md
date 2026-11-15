# 16 — Cálculo, recálculo e rastreabilidade de resultados

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF08, RF10–RF13, RF15, RF32 e RF35; RF14 quando liberado; RNF09 e RNF10.

**Dependências:** [06](06-inventario-versionado.md), [07](07-auditoria-de-alteracoes.md), [13](13-respostas-e-painel-do-empresario.md), [15](15-metodologia-dos-indicadores.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Preservar fonte, revisão, capacidade e metodologia utilizadas. Totais das planilhas são referências de saída, não novas respostas; não fabricar linhagem de entradas para indicadores legados agregados.

## Objetivo

Produzir indicadores reproduzíveis e propagar atualizações sem apagar o histórico publicado.
Para diária e componentes externos de fluxo, a parte 17 também é dependência de liberação.

## Backend e dados

- Implementar serviços de cálculo separados de controllers/importadores, com aritmética
  decimal e as fórmulas aprovadas. Selecionar apenas dados válidos/conferidos conforme metodologia.
- Usar capacidade com vigência adequada; quando variar dentro do período, aplicar a regra
  homologada de segmentação temporal, sem escolher sempre a versão mais recente.
- Gravar `IndicadorResultado`, inventários utilizados e parâmetros utilizados; evoluir o
  schema para identificar também versão da fórmula, respostas/coletas de origem, população,
  execução, revisão e estado de publicação. As tabelas atuais não bastam para toda essa linhagem.
- Definir dependências entre fontes e resultados. Alteração de inventário, resposta,
  parâmetro ou importação deve marcar resultados afetados para revisão/recálculo.
- Processar de forma idempotente com estados pendente, executando, concluído e falhou
  (modelagem a criar); permitir retomada e observação de erros sem resultado parcial publicado.
- Definir controle de concorrência e leitura consistente dos insumos para uma execução.
  Um cálculo em andamento não deve combinar revisões incompatíveis das fontes.
- Separar resultado calculado de resultado publicado. Recálculo gera nova revisão; decisão
  autorizada substitui a versão de consumo, preservando a anterior e seu motivo.

## API e operação

Consulta por indicador/período/recorte/método/tipo de coleta; execução/reexecução conforme
permissão, acompanhamento de processamento e detalhe da linhagem. Resposta enviada e cálculo
pendente devem ser distinguíveis na interface.

## Critérios de aceite e testes

- Resultados coincidem com a massa oficial dentro da tolerância aprovada na parte 15.
- Alterar insumo relevante afeta somente resultados dependentes e deixa evidência de revisão.
- Repetir processamento não cria publicações duplicadas nem elimina versões anteriores.
- Falha intermediária não publica valores incompletos ou mistura revisões das fontes.
- Valores históricos são reproduzíveis com suas entradas, fórmula e parâmetros preservados.
