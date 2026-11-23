# 16 — Cálculo, recálculo e rastreabilidade de resultados

**Situação:** primeiro incremento implementado: execução da fórmula v1 por pergunta de taxa
de ocupação, com insumos congelados, estados, idempotência, revisões, publicação/substituição e
linhagem. Valores são demonstrativos; a metodologia não foi homologada pelo OTO. Diária média e
fluxo externo seguem dependentes da [parte 17](17-diarias-rhc-e-fontes-complementares.md).

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

## Implementação (primeiro incremento)

Contrato HTTP em [docs/contratos/calculos.md](../contratos/calculos.md).

- **Série de cálculo:** uma pergunta percentual de uma edição (`PesquisaPergunta`); período e
  tipo de coleta vêm da pergunta. `POST /api/calculos` recebe só `perguntaId` e `motivo`.
- **Leitura consistente:** os insumos são lidos numa transação `REPEATABLE READ` e congelados
  em `calculo_execucao.insumos` (JSONB) com hash SHA-256 do núcleo canônico (sem rótulos).
  O cálculo roda sobre esse retrato, nunca sobre dados lidos depois.
- **Insumos:** público congelado na abertura (`PesquisaDestinatario`) ou, em edição legada,
  elegíveis no momento do cálculo (registrado em `populacao`); respondente é quem tem item da
  pergunta; capacidade de versões de inventário não substituídas e conferidas (completo ou
  parcial); parâmetros `day_use.fator_hospedados`, `day_use.percentual` e
  `leitos_media.minimo_por_uh`; RHC agregado do período. Ausência vira indicador indisponível
  com motivo, nunca zero.
- **Estados:** `pendente → executando → concluido | falhou`; falha e execução interrompida
  (mais de 10 minutos) podem ser retomadas pelo mesmo retrato. Os resultados são gravados numa
  única transação junto com a conclusão: falha não deixa resultado parcial.
- **Idempotência e concorrência:** índice único parcial impede duas execuções ativas da mesma
  pergunta (409); retrato com o mesmo hash da última revisão concluída é reaproveitado (200).
  Revisão é numerada na conclusão, sob trava consultiva por pergunta.
- **Publicação:** `calculado → publicado → substituido`. Substituir a publicação vigente exige
  motivo; a anterior é preservada com `substituidaPorId`. `GET /api/indicadores` passa a listar
  só resultados de carga (sem execução) e os da execução publicada com valor disponível.
- **Linhagem:** respostas (`calculo_execucao_resposta`), versões de inventário e parâmetros por
  resultado (`IndicadorResultadoVersao`/`IndicadorResultadoParametro`), versão da fórmula,
  população, autor e auditoria na mesma transação. Gatilhos impedem reescrever execução,
  resultados e vínculos.
- **Indicadores gravados:** os 18 da tabulação (recorte `total`) e ocupação por tipo (recorte =
  categoria). `metodo` é `ponderada` para as taxas e `nao_se_aplica` nos demais.
- **Interface:** página **Cálculos** (administrador e gestor): grade OData, novo cálculo,
  detalhe com resultados, insumos congelados, aviso de insumos alterados, retomada e publicação.

### Evidências

- `common/test/calculos/`: validadores, guardas e esquema OData.
- `apps/backend/test/calculos.test.ts`: capacidade/parâmetro/RHC no período, montagem da
  fórmula (caso do seed: 75% em 10 UH e 50% em 5 UH → 66,666666666667%), hash, falha sem
  resultado parcial, publicação com substituição e motivo.
- `apps/backend/test/calculos.integration.test.ts`: fluxo HTTP/PostgreSQL de cálculo,
  reaproveitamento, correção de resposta, nova revisão, publicação, substituição, consumo e
  gatilhos. **Não executado neste ambiente** (sem PostgreSQL/PostGIS de teste); suíte ignorada
  sem `DATABASE_TEST_URL` não equivale a integração aprovada.
- `apps/frontend/src/pages/calculos/calculos.test.tsx`: grade, detalhe, publicação, motivo
  obrigatório na substituição e novo cálculo.

### Pendências

- Segmentação temporal quando a capacidade varia no período: hoje o meio fica com capacidade
  `varia_no_periodo` e os indicadores dependentes indisponíveis.
- RHC: `RhcPeriodo` não registra o máximo de leitos por unidade (`MH!G88`, digitado na
  planilha), então turistas em RHC ficam indisponíveis; regra de revisões/vários registros do
  período pertence à parte 17 (mais de um registro é tratado como ambíguo).
- Faixas de ocupação: a lista não cabe no valor decimal de `ParametroCalculo`; o indicador de
  faixas não é gravado até definir sua representação.
- Diária média e fluxo externo dependem da parte 17.
- Marcação de resultados afetados no momento da escrita das fontes foi substituída pela
  comparação de hash no detalhe (`insumosAtuais`); marcação ativa e recálculo automático
  ficam para incremento futuro.
- Novas `IndicadorDefinicao` são criadas sem visibilidade; a administração libera por perfil.
- Tolerância e massa oficial de conferência (parte 15) e homologação pelo OTO.
