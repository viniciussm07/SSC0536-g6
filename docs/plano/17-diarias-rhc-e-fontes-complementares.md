# 17 — Diárias, RHC e fontes complementares

**Situação:** coleta manual, conferência e contratos implementados; importação (partes 08–09),
consumo pelo cálculo (parte 16) e homologação do OTO permanecem pendentes.

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

## Registro da entrega (coleta manual)

- **Migration:** `20261126000000_fontes_complementares` acrescenta proveniência e conferência a
  `coleta_diaria` e `rhc_periodo` (`origem`, `situacao_conferencia`, `revisao`, responsável,
  referência/observação) e `unidade`, `situacao` e `observacao` a `parametro_calculo`. Campos
  novos têm default para não invalidar a massa existente; nenhum banco é resetado.
- **Common:** domínio `diarias` com contratos e validadores de coleta de diária, RHC e parâmetro,
  esquemas OData `coletasDiarias`, `rhcPeriodos` e `parametrosCalculo`, além das coleções
  correspondentes. Decimais são strings; ausência de linha é distinta de zero.
- **Backend:** módulo `diarias` com `GET/POST/PUT` em `/coletas-diarias`, `/rhc-periodos` e
  `/parametros-calculo`, coleções OData e CSV sob o recurso `calculos` com escopo global. A coleta
  é sempre `manual`; alteração de campo de negócio volta a observação para `pendente`; a
  conferência registra autor/data; duplicata/conflito, vigência sobreposta e segunda conferência
  de RHC no período retornam 409; auditoria é gravada na mesma transação com snapshots das
  entidades novas.
- **Regras propostas, pendentes do OTO:** identidade da diária por empreendimento, período, fonte,
  data de estadia e tipo de dia (sem constraint única no banco, serializada por trava consultiva);
  somente um RHC `conferida` por período, serializado por período; `dataEstadia` deve pertencer ao
  período; `fonte` permanece texto livre e `site_proprio` não foi fixado; preço é ofertado, não
  receita realizada.
- **Parâmetros:** a mesma chave não pode ter vigências sobrepostas; a regra ainda não tem
  constraint no banco e é serializada por chave. A situação `homologado` continua sujeita à
  definição de quem pode homologar.
- **Frontend:** página `/diarias` com abas de diárias, RHC e parâmetros, formulários em TanStack
  Form, conferência, origem e estado de indisponibilidade quando não há fonte.
- **Testes executados localmente:** common 257 (validadores, guardas e coleções), backend
  unitário 64+8 (diária, RHC, parâmetros, snapshots e mapeadores) e frontend 179 (carga, criação,
  conflito 409, erro 400, abas e permissão). `pnpm test` também passou; a integração
  HTTP/PostgreSQL foi marcada como _skip_ por ausência de `DATABASE_TEST_URL`, portanto não
  foi executada nem declarada aprovada. `pnpm lint`, `pnpm typecheck`, `pnpm build`,
  `pnpm format:check`, `pnpm validate:repo` e `pnpm db:validate` passaram.

### Pendências desta entrega

- Importação de planilhas continua bloqueada pelas partes 08–09; a rota de upload não foi criada.
- A parte 16 ainda não consome as fontes conferidas; nenhum `IndicadorResultado` é gerado aqui.
- Protocolo da diária (coleta × estadia, semana/fim de semana, amostra de 80+ leitos), enquadramento
  de sites próprios, outliers e agregação de RHC aguardam homologação do OTO.
- Outras fontes (CAGED, ISSQN, fluxo rodoviário, pesquisa direta) e scraping permanecem fora do
  escopo; não há adaptadores nem credenciais.
