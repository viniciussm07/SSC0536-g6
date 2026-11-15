# Pesquisa de diária média dos meios de hospedagem

## Arquivos de referência

- [Pesquisa Diária Média Meio de Hospedagem - Excel - Cópia.xlsx](<Pesquisa Diária Média Meio de Hospedagem - Excel - Cópia.xlsx>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Estrutura de coleta e consolidação de preços de hospedagem, com recortes por estabelecimento,
categoria, datas, mês e feriados, além de médias aritméticas e ponderadas.

O cabeçalho descreve valores para uma diária de dois adultos e uma criança de até 12 anos,
em apartamento standard, obtidos em Booking.com e sites próprios. A evolução de 2026 indica
recorte de estabelecimentos com 80 leitos ou mais. Esses protocolos devem ser confirmados
antes de generalizar o indicador a todos os meios de hospedagem.

## Abas utilizadas

- Abas de meses/anos, como `JANEIRO 2026`: estrutura das observações de preço por hospedagem/data.
- `FERIADOS`: observações e consolidação nos recortes especiais.
- `EVOLUÇÃO MENSAL - 2024`, `EVOLUÇÃO MENSAL - 2025` e `EVOLUÇÃO MENSAL - 2026`:
  metodologia e organização dos resultados por categoria e mês.
- `Hotel`, `Resort` e `Pousada`: referência de layouts por categoria.
- Abas de relatório e `DADOS PARA GRAFICOS`: referência de saída, sem reimportar valores
  derivados como novas observações de preço.

A aba `Responsáveis pelas pesquisas` não é necessária para a importação prevista e não
serve de origem automática para usuários da aplicação.

## Como será usada no projeto

Implementar o parser de observações, a conferência de preços e o indicador de diária média
já representado no MER. Conciliar nomes de hospedagens com o cadastro central e preservar
proveniência, unidade e protocolo de coleta.

No MER, corresponde a `coleta_diaria`, `empreendimento`, `periodo`, definições/resultados de
indicadores e rastreabilidade dos parâmetros e pesos utilizados.

## Decisões e limites

- Distinguir data de coleta de preço e data de estadia. Confirmar a informação disponível
  ou o metadado a fornecer, pois o MER exige ambas.
- Confirmar enquadramento das fontes: a legenda atual do MER (`booking` ou `empresario`)
  não cobre necessariamente todos os sites próprios citados no arquivo.
- Confirmar definição de semana/fim de semana, pesos, amostra e tratamento de preços ausentes.
- Preço ofertado não significa receita efetivamente realizada; não inferir faturamento real.
- Não é necessário implementar scraping para usar o esqueleto como base do parser.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `Pesquisa Diária Média Meio de Hospedagem - Excel - Cópia.xlsx`: `b494ab6c91ee85e9b9d4f70df0dece3e553c86e89250e4f6abf93526eec6892b`
