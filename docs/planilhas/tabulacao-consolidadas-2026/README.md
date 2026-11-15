# Tabulação de ocupação consolidada — 2026

## Arquivos de referência

- [PLANILHA TABULAÇÃO CONSOLIDADAS 2026 - Cópia.xlsx](<PLANILHA TABULAÇÃO CONSOLIDADAS 2026 - Cópia.xlsx>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Processo de tabulação das pesquisas de ocupação já realizada, por mês ou período especial.
Combina respostas de hospedagens, capacidade, ponderações, cobertura dos respondentes e
estimativas relacionadas ao fluxo de turistas, produzindo informações para boletins.

## Abas utilizadas

- `MH`: referência de hospedagens, UH, leitos, ajustes de capacidade, categorias e pesos.
- `TABULAÇÃO`: estrutura da edição pesquisada, percentuais de ocupação, respondentes,
  fórmulas e consolidação dos resultados do período.
- `ACUMULADO`: organização dos resultados por mês/feriado, cobertura da pesquisa,
  informações de fluxo, RHC e day use e dados destinados a boletins.

## Como será usada no projeto

Definir a coleta de Consolidado, mapear valores por empreendimento e período e entender
como a equipe do OTO transforma as respostas em indicadores. A capacidade da aba `MH`
deve ser conciliada com o inventário, sem criar uma segunda manutenção de leitos e UH.

As fórmulas são referência de metodologia a validar; os resultados derivados não devem
ser importados como se fossem novas respostas. Um caso fictício com entradas e resultados
esperados, aprovado pelo OTO, servirá para testar o cálculo implementado.

No MER, corresponde a `pesquisa_modelo`, `pesquisa_campo`, `pesquisa`, `pesquisa_pergunta`,
`periodo`, `resposta`, `resposta_item`, `indicador_definicao`, `indicador_resultado`,
`parametro_calculo` e às relações de rastreabilidade de inventários e parâmetros.

## Decisões e limites

- Confirmar unidade da ocupação, pesos, população elegível, não respondentes e tratamento
  da capacidade ajustada. Os cabeçalhos e as fórmulas não dispensam aprovação metodológica.
- A nota de `TABULAÇÃO!B97` atribui o percentual de day use à Pesquisa de Demanda 2024.
  O ZIP contém o esqueleto de demanda de 2026. Confirmar valor, origem e vigência com OTO;
  não substituir automaticamente por outro ano nem fixar o parâmetro no código.
- Distinguir fluxo de hóspedes, visitantes únicos e pernoites; não presumir equivalência.
- Não foi identificada neste arquivo uma exportação original dos formulários com todas
  as regras de preenchimento. Solicitar formulário ou dicionário, sem respostas reais.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `PLANILHA TABULAÇÃO CONSOLIDADAS 2026 - Cópia.xlsx`: `4d4485bc5b97350384cc2e950be08fbb3fac20cab9274d55818790d709e7c8f6`
