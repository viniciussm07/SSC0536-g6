# 19 — Previsão estatística experimental

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** Objetivos da seção 3.1 e requisitos não técnicos da seção 3.5; apoio a RF16–RF18.

**Dependências:** [09](09-importacao-conciliacao-e-persistencia.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [18](18-consulta-dashboards-e-boletins.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).

As estruturas foram recebidas, mas não uma série numérica para avaliar previsão real. Usar sintéticos apenas para demonstrar a mecânica; avaliação preditiva do OTO permanece condicionada a histórico autorizado suficiente, eventualmente agregado.

## Objetivo e decisão de continuidade

Investigar viabilidade de estimar demanda/ocupação futura. É uma capacidade condicionada
à quantidade, periodicidade, cobertura e qualidade do histórico; não bloqueia o valor da POC
operacional se não houver dados suficientes. Expectativa de pesquisa continua sendo outro produto.

## Pré-requisitos específicos

Histórico autorizado com datas e revisões, definição de alvo/horizonte/granularidade,
tratamento de faltantes e mudanças metodológicas, fontes explicativas aprovadas e critério
mensurável de utilidade. OTO e equipe registram decisão de prosseguir ou limitar à análise histórica.

## Trabalho previsto

1. Avaliar cobertura temporal, estabilidade da população, sazonalidade e disponibilidade
   de cada variável na data em que a previsão seria feita.
2. Preparar dataset versionado e divisões temporais de treino/validação/teste; evitar usar
   respostas consolidadas ou revisões que só seriam conhecidas após a data prevista.
3. Criar baseline simples (por exemplo, referência sazonal compatível com a série) e
   comparar candidatos estatísticos sem assumir arquitetura/modelo antes da análise.
4. Escolher métricas coerentes com o alvo e presença de zeros, executar avaliação temporal
   e registrar limites, incerteza, desempenho por horizonte e comparação com o baseline.
5. Se houver evidência de utilidade, modelar execução, versão de dataset/modelo, previsão,
   data de emissão e período-alvo. O schema atual não tem entidades específicas de previsão.
6. Expor estimativas e comparação posterior com realizado, preservando o que era conhecido
   no momento da emissão; definir revisão/atualização do modelo e acompanhamento de erro.

## Interface e aceite

Apresentar a natureza experimental, intervalo/incerteza quando suportado, data de emissão,
horizonte e referência de avaliação. Não apresentar previsão como valor exato ou promessa.

A parte termina com relatório reproduzível de viabilidade. Só considerar a funcionalidade
preditiva entregue se existir avaliação aprovada e consulta funcional. Se os dados forem
insuficientes ou o baseline não for superado de forma útil, documentar a decisão e entregar
as análises históricas previstas, sem rotular um mock como modelo validado.
