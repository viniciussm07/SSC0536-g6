# Cálculo, revisão e publicação de indicadores — parte 16

Implementação do primeiro incremento da [parte 16](../plano/16-calculo-recalculo-e-rastreabilidade.md)
sobre a fórmula v1 da [parte 15](indicadores.md). Os valores são **demonstrativos**: as fórmulas e
os parâmetros são hipóteses transcritas das planilhas e não foram homologados pelo OTO.

Contratos portáveis em `@ssc0536/common`, domínio `calculos`; esquema OData `ESQUEMA_CALCULOS`.

## Permissões

| Operação                              | Recurso/ação           | Perfis iniciais       |
| ------------------------------------- | ---------------------- | --------------------- |
| `GET /api/calculos`, `/:id`           | `calculos` consultar   | administrador, gestor |
| `POST /api/calculos`, `/:id/retomada` | `calculos` criar       | administrador, gestor |
| `POST /api/calculos/:id/publicacao`   | `publicacoes` publicar | administrador, gestor |

Todas exigem escopo `todos`: o cálculo agrega todos os meios da edição. Autoria vem da sessão.

## Série, insumos e retrato

Uma **série** é uma pergunta percentual (`PesquisaPergunta` de campo `percentual`); período e
tipo de coleta vêm da pergunta e da edição. Os insumos são lidos numa transação
`REPEATABLE READ` e congelados em `insumos` (`InsumosCalculo`):

- `populacao`: `destinatarios` (público congelado na abertura) ou `elegiveis_no_calculo`
  (edição legada sem público registrado).
- `meios[]`: empreendimento, categoria, `capacidade` (`vigente`, `ausente`,
  `varia_no_periodo`), versões de inventário usadas, UH, leitos, máximo por UH, resposta e taxa
  (string decimal 0–100, ou `null` quando o meio não respondeu a pergunta). Só versões não
  substituídas e conferidas (`completo`/`parcial`) entram; capacidade é `vigente` apenas quando
  uma única versão cobre o período inteiro.
- `rhc`: `vigente` (agregado `conferida` do período), `ausente` (sem registro conferido) ou
  `ambiguo` (mais de um conferido). Registros `pendente`/`divergente` da parte 17 não entram.
- `parametros[]`: `day_use.fator_hospedados`, `day_use.percentual` e
  `leitos_media.minimo_por_uh`, cada um `vigente` (um registro cobre o período), `ausente` ou
  `ambiguo`. Valores decimais em string; quando a fonte da parte 17 os registra, o retrato
  também guarda `situacaoHomologacao` e `unidade`, sem tratá-los como homologados.

O hash (`insumosHash`, SHA-256 hexadecimal) é calculado sobre o JSON canônico do núcleo do
retrato, sem rótulos (nome do meio, título, rótulo do período).

## `POST /api/calculos`

Corpo (whitelist): `{ "perguntaId": 11, "motivo": "Correção de resposta fictícia" }`.
`motivo` é opcional (até 500 caracteres, aparado; vazio equivale a ausente).

- **201** `{ "data": { "execucao": ExecucaoCalculoDetalhe, "reaproveitada": false } }`: nova
  execução, já processada (`concluido` ou `falhou`).
- **200** com `reaproveitada: true`: o retrato atual tem o mesmo hash da última revisão
  concluída da série; nenhuma execução é criada.
- **400** `ENTRADA_INVALIDA` (campo alheio, `perguntaId` não inteiro positivo) ou
  `PERGUNTA_NAO_CALCULAVEL` (pergunta não percentual). **404** `PERGUNTA_NAO_ENCONTRADA`.
- **409** `CALCULO_EM_ANDAMENTO`: já existe execução `pendente`/`executando` da pergunta.

## Estados

`situacao`: `pendente → executando → concluido | falhou`. Os resultados e a conclusão são
gravados na mesma transação: falha não deixa resultado parcial. `erro` guarda a mensagem de
domínio (entrada inválida para a fórmula) ou uma mensagem genérica, sem dados pessoais.
`revisao` é numerada só na conclusão (1, 2, …) por pergunta; execução que falhou tem
`revisao: null`.

`POST /api/calculos/:id/retomada` reprocessa o **mesmo retrato** de uma execução `falhou` ou
interrompida (`pendente`/`executando` há mais de 10 minutos). **200** com o detalhe; **409**
`CALCULO_NAO_RETOMAVEL` nos demais casos.

## Publicação

`publicacao`: `calculado → publicado → substituido`.

`POST /api/calculos/:id/publicacao` com `{}` ou `{ "motivo": "..." }`:

- Exige `situacao: concluido` e `publicacao: calculado`, senão **409** `CALCULO_NAO_CONCLUIDO`
  ou `CALCULO_JA_PUBLICADO`.
- Havendo publicação vigente da mesma pergunta, `motivo` é obrigatório (**400**
  `ENTRADA_INVALIDA`, `field: "motivo"`); a anterior passa a `substituido`, com
  `substituidaPorId`, e continua consultável com seus valores.

`GET /api/indicadores` lista resultados de carga (sem execução) e os da execução `publicado`
com valor disponível. Resultados calculados, substituídos ou indisponíveis ficam no detalhe.
O contrato inclui `periodoId` filtrável/ordenável, além de `id`, `indicadorId`, `nome`,
`unidade`, `periodo`, `tipoColeta`, `recorte`, `metodo` e `valor`.

O recálculo concluído limpa `importacao_lote.recalculo_pendente` dos lotes cuja pergunta é a
mesma série calculada; nenhum resultado histórico é reescrito.

## `GET /api/calculos` e `GET /api/calculos/:id`

Coleção OData (`$filter`, `$orderby`, `$top`, `$skip`, `$count`) de `ExecucaoCalculoLinha`:
`id`, `periodoId`, `periodo`, `tipoColeta`, `pesquisaId`, `pesquisa`, `perguntaId`, `revisao`,
`versaoFormula`, `situacao`, `publicacao`, `motivo`, `erro`, `solicitadaEm`, `solicitadaPor`,
`concluidaEm`, `publicadaEm`, `publicadaPorId`. Ordem padrão: `solicitadaEm desc, id desc`.

O detalhe acrescenta `motivoPublicacao`, `substituidaPorId`, `insumos`, `resultados[]` e
`insumosAtuais` (`iguais`/`alterados`), que compara o hash do retrato com uma releitura atual
das fontes: `alterados` indica que respostas, inventário, parâmetros ou RHC mudaram e que um
novo cálculo gerará nova revisão.

Cada resultado: `{ id, indicadorId, codigo, nome, unidade, recorte, metodo, valor }`, com
`valor` `{ "estado": "disponivel", "valor": "66.666666666667" }` ou
`{ "estado": "indisponivel", "motivo": "dado_ausente", "detalhe": "..." }`. Indisponível nunca
é zero. São gravados os 18 indicadores da tabulação (recorte `total`) e a ocupação por tipo
(recorte = categoria); `metodo` é `ponderada` nas taxas e `nao_se_aplica` nos demais.

## Linhagem e imutabilidade

Cada execução guarda autor, retrato, hash, versão da fórmula e respostas usadas
(`calculo_execucao_resposta`); cada resultado guarda as versões de inventário e os parâmetros
usados. Auditoria (`calculo_execucao`) é gravada na mesma transação de cada transição.
Gatilhos do banco impedem excluir execuções, reescrever retrato/série, pular estados e
alterar resultados ou vínculos — ver as [decisões do modelo](../../apps/backend/prisma/README.md).

## Pendências

Segmentação de capacidade variável no período, máximo de leitos por unidade do RHC, regra de
vários registros conferidos de RHC, representação das faixas de ocupação, diária média e fluxo
externo (parte 17), marcação ativa de resultados afetados e homologação pelo OTO. Detalhes na
[parte 16](../plano/16-calculo-recalculo-e-rastreabilidade.md).
