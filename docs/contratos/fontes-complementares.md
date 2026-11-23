# Fontes complementares: diárias, RHC e parâmetros

Implementação da [parte 17](../plano/17-diarias-rhc-e-fontes-complementares.md). Autoriza o
recurso `calculos` (administrador e gestor na matriz inicial) e **exige escopo global**: uma
concessão `vinculados` não libera estas rotas. Todos os endpoints ficam sob `/api`, devolvem
`{ "data": ... }` e usam os erros do envelope de negócio. A coleta manual é `origem=manual`;
importação depende das partes 08–09.

## Coletas de diária

- `GET /api/coletas-diarias` — coleção OData (`$filter`, `$orderby`, `$top`, `$skip`, `$count`)
  e `GET /api/coletas-diarias/exportacoes` para CSV.
- `GET /api/coletas-diarias/:id`.
- `POST /api/coletas-diarias` (`201`).
- `PUT /api/coletas-diarias/:id` (alteração parcial).

Exemplo fictício de criação:

```json
{
  "empreendimentoId": 900001,
  "periodoId": 900002,
  "fonte": "booking",
  "dataColeta": "2026-11-01",
  "dataEstadia": "2026-11-15",
  "tipoDia": "fim_de_semana",
  "valorDiaria": "199,90",
  "moeda": "BRL",
  "unidadePreco": "por_uh_diaria",
  "referenciaOrigem": "aba JANEIRO 2026; célula AI6",
  "observacao": "Preço ofertado; não é receita realizada."
}
```

- `valorDiaria` é decimal em texto (vírgula aceita e normalizada para ponto), positivo e
  limitado a 1.000.000 por sanidade; não é arredondado.
- `dataColeta` e `dataEstadia` são datas civis distintas. `dataEstadia` precisa pertencer ao
  período selecionado.
- `fonte` é texto livre (ex.: `booking`, `empresario`); o enquadramento de sites próprios está
  pendente. `moeda` usa ISO 4217 (`BRL` por padrão) e `unidadePreco` aceita `por_uh_diaria`.
- A identidade proposta é empreendimento + período + fonte + data de estadia + tipo de dia.
  O mesmo conjunto com o mesmo valor retorna `409 COLETA_DIARIA_DUPLICADA`; com valor diferente,
  `409 COLETA_DIARIA_CONFLITO`. A regra ainda não tem constraint única no banco; a verificação
  é serializada por trava consultiva por identidade dentro da transação.
- `origem` nasce `manual`; `situacaoConferencia` nasce `pendente`. Alterar campo de negócio
  volta para `pendente`; conferir grava autor/data. Valores aceitos: `pendente`, `conferida`,
  `divergente`.

## RHC por período

- `GET /api/rhc-periodos` (OData + CSV), `GET/POST/PUT` para detalhe e escrita.
- Corpo de criação: `{ "periodoId": 900002, "qtdRhc": 2, "leitos": 8, "observacao": null }`.
- `qtdRhc` e `leitos` são inteiros entre 0 e 10.000.000. Zero é valor informado; ausência de
  linha significa fonte não informada.
- Várias observações por período são permitidas, mas só uma pode estar `conferida`
  (`409 RHC_JA_CONFERIDO`). A conferência é serializada por trava consultiva do período.
  Cada alteração de quantidade/leitos/período incrementa `revisao`; alterar qualquer campo
  de negócio ou a observação volta a conferência para `pendente`.
- Não há cadastro pessoal de proprietários, CPF ou endereço de RHC.

## Parâmetros de cálculo

- `GET /api/parametros-calculo` (OData + CSV), `GET/POST/PUT`.
- Corpo de criação:

```json
{
  "chave": "day_use.percentual",
  "valor": "15.15",
  "unidade": "percentual_0_100",
  "vigenciaInicio": "2026-01-01",
  "vigenciaFim": null,
  "fonte": "Nota de TABULAÇÃO!B97; hipótese pendente.",
  "situacao": "hipotese_pendente_homologacao"
}
```

- `valor` é decimal em texto, inclusive zero. `vigenciaFim`, quando presente, não pode ser
  anterior a `vigenciaInicio`. `situacao` aceita `hipotese_pendente_homologacao` ou `homologado`.
- Chave repetida com o mesmo início de vigência retorna `409 PARAMETRO_DUPLICADO`. Vigências
  sobrepostas para a mesma chave retornam `409 PARAMETRO_VIGENCIA_SOBREPOSTA` e a checagem é
  serializada por chave. O histórico é preservado por linhas com vigências distintas e pela
  auditoria; não há exclusão.

## Auditoria e limites

Criação e alteração gravam auditoria (`coleta_diaria`, `rhc_periodo`, `parametro_calculo`) na
mesma transação, com os campos dessas entidades preservados nos snapshots. A leitura e a escrita
exigem `calculos:consultar/criar/alterar` com escopo global; o CSV exige `calculos:exportar`.
Importação, cálculo de indicador, scraping e fontes externas não fazem parte desta entrega.
