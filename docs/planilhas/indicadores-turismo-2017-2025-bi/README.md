# Indicadores do turismo e referência de BI

## Arquivos de referência

- [INDICADORES DO TURISMO - 2017_2025 - BI - Copia.ods](<INDICADORES DO TURISMO - 2017_2025 - BI - Copia.ods>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Consolidação histórica e organização de indicadores de várias frentes do OTO, com 51 abas.
Funciona como referência de nomenclatura, períodos, apresentação e comparações. O esqueleto
não disponibiliza a série numérica histórica necessária para avaliar previsões reais.

## Abas e recortes utilizados

- Taxa de ocupação: Consolidado mensal, Consolidado de feriados e Expectativa de feriados.
- Fluxo de turistas: recortes mensais e de feriados relacionados à metodologia hoteleira.
- Totais de empresas de hospedagem, por tipo, leitos, UH e RHC.
- Diária média: Geral, Hotel, Resort e Pousada.
- `Controle de Indicadores`: somente as definições e o acompanhamento dos indicadores selecionados.
- Cadastur de meios de hospedagem: referência adicional de conferência, se incluída na entrega.

`Dados de Pernoites` só entra como referência após esclarecer o significado: o cabeçalho
indica média de pernoites, que não deve ser confundida com o total de pernoites estimado
pela ocupação e pela capacidade. A fonte e a fórmula de cada métrica precisam ser identificadas.

Não incluir automaticamente as abas de CAGED, ISSQN, NPS, fretamento, veículos, alimentação,
atrações e outros segmentos no dashboard desta POC. Ticket médio também exige definição
própria; não equivale automaticamente à diária média.

## Como será usada no projeto

Definir a camada de consumo, selecionar comparações relevantes e alinhar os resultados
produzidos pela aplicação aos conceitos usados nos boletins/BI do OTO. As fórmulas de
negócio terão implementação centralizada, evitando versões divergentes no dashboard.

No MER, relaciona-se a `indicador_definicao`, `indicador_resultado`, `periodo`, parâmetros
e relações de rastreabilidade. Importação futura de valores históricos agregados precisa
preservar fonte, método e condição de resultado legado; não fabricar entradas individuais
ou uma linhagem de cálculo que não esteja disponível.

## Decisões e limites

- Selecionar indicadores com OTO antes de configurar telas, exports ou Looker Studio.
- Resultados vazios do esqueleto não servem como validação numérica: usar massa fictícia
  com resultados esperados homologados para testar a POC.
- Histórico agregado autorizado, se disponibilizado, pode apoiar comparações e avaliação
  estatística. Sem histórico numérico suficiente, a previsão permanece uma demonstração técnica.
- Confirmar metodologia, frequência, cobertura, revisões e público autorizado de cada indicador.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `INDICADORES DO TURISMO - 2017_2025 - BI - Copia.ods`: `602b1229d6d15be510baddd9d0b91a193b28fce9d0695eccbf955a0b10494616`
