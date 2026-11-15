# 17 — Diárias, RHC e fontes complementares

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF04, RF06, RF13 e RF14; apoio a RF16; RNF07.

**Dependências:** [09](09-importacao-conciliacao-e-persistencia.md), [10](10-periodos-e-calendario.md), [15](15-metodologia-dos-indicadores.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

O esqueleto de diária e as estruturas de RHC foram recebidos. Confirmar protocolo da diária (ocupantes/tipo de quarto, recorte de amostra, fonte, data de coleta versus estadia). No MER, RHC é agregado por período; CPF e cadastro pessoal das casas não são necessários.

## Objetivo e condição de escopo

Incorporar fontes adicionais necessárias aos indicadores aprovados. A diária média é
condicionada à inclusão da fonte no recorte, conforme RF14. Cada fonte só avança com
seus próprios arquivos/acessos e sua metodologia homologada.

## Coleta de diárias

- Mapear as planilhas reais para `ColetaDiaria`, identificando estabelecimento, período,
  fonte, data da coleta, data da estadia, tipo de dia, moeda e unidade do preço.
- Definir identidade da observação e regras de reimportação/conflito; o schema atual não
  contém toda a proveniência de cada preço e pode precisar de campos/vínculos adicionais.
- Validar preços, ausências, outliers e distinção entre valores ofertados e realizados.
- Oferecer coleta manual autorizada e importação quando aprovadas; não presumir scraping
  de plataformas comerciais nem tratar preço ofertado como diária efetivamente paga.

## RHC e parâmetros de fluxo

- Mapear `RhcPeriodo` e `ParametroCalculo` às fontes confirmadas; definir se existe um agregado
  por período ou múltiplas observações, antes de impor unicidade adicional ao schema.
- Registrar quantidade/leitos, origem, vigência, revisão e responsável pela conferência.
- Validar fatores de ajuste e datas da fonte; dado desconhecido não equivale a ausência de RHC.

## Outras fontes e integração

Inventariar APIs/arquivos relevantes à vertical hoteleira, com periodicidade, disponibilidade,
responsável, formato e utilidade. Priorizar somente após acordo de escopo. CAGED, ISSQN,
fluxo rodoviário e pesquisa direta com turistas não são entregas automáticas desta POC
por constarem do acervo amplo do OTO. Planejar adaptadores e credenciais só para fontes aprovadas.

## Frontend e critérios de aceite

Disponibilizar revisão de observações, origem e estado de conferência; apresentar indisponibilidade
quando a fonte estiver ausente. Testar reimportação, duplicatas, moeda/unidade, período incorreto,
preço inválido e histórico de parâmetros. A ficha da parte 15 e o cálculo da parte 16 devem
consumir a fonte conferida e reproduzir a tabulação de referência.
