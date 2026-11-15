# Tabulação de expectativa de ocupação — 2026

## Arquivos de referência

- [PLANILHA TABULAÇÃO EXPECTATIVA 2026 - Cópia.xlsx](<PLANILHA TABULAÇÃO EXPECTATIVA 2026 - Cópia.xlsx>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Tabulação da expectativa de ocupação informada pelos meios de hospedagem para períodos
futuros, incluindo feriados. Produz estimativas declaradas pelos participantes, diferentes
de uma previsão estatística calculada por um modelo.

## Abas utilizadas

- `MH`: hospedagens, capacidade, categorias, ajustes e pesos usados na tabulação.
- `TABULAÇÃO`: estrutura da edição, ocupação esperada por empreendimento e consolidação.
- `ACUMULADO MENSAL`: organização das expectativas por período, participação e resultados.
- `CÁLCULO DA RECEITA ESTIMADA`: referência adicional de dependências entre capacidade,
  ocupação e diária. Sua presença não torna receita estimada uma entrega obrigatória.

## Como será usada no projeto

Orientar os modelos de pesquisa de Expectativa, os períodos futuros e o processamento
das respostas. Permitir comparação posterior com Consolidado, respeitando recorte,
metodologia e população de cada resultado. Conciliar a aba `MH` com o cadastro central.

No MER, corresponde a pesquisas com `tipo_coleta` de expectativa, seus campos/perguntas,
`periodo`, `resposta`, `resposta_item`, indicadores e parâmetros de cálculo. Capacidade
histórica pertence a `inventario_versao`; não deve ser copiada como cadastro independente.

## Decisões e limites

- Confirmar antecedência da coleta, data de corte e tratamento de novas respostas e correções.
- Validar pesos, unidade e regra de comparação entre expectativa e realização.
- A tabulação também referencia ajuste de day use atribuído à Pesquisa de Demanda 2024;
  usar parâmetro aprovado com origem e vigência.
- Confirmar as perguntas e obrigatoriedade por meio do formulário original ou dicionário.
- Não tratar os esqueletos como série histórica preenchida nem como modelo preditivo validado.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `PLANILHA TABULAÇÃO EXPECTATIVA 2026 - Cópia.xlsx`: `fbc7beea966df1a38facda71277b9b3544760c8ec0585e69a82690df0bd82f00`
