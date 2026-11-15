# Inventário versionado

Implementação técnica da [parte 06](../plano/06-inventario-versionado.md). Capacidade,
funcionamento e respostas do [catálogo](catalogos.md) de um empreendimento ficam em **versões**
com vigência, autor e data. As regras abaixo são **convenções técnicas provisórias**: a R06
(vigência e correção) segue pendente de aprovação do OTO.

## Linha do tempo e vigência (R06 provisória)

- Datas civis (`AAAA-MM-DD`), **início e fim inclusivos**; `vigenciaFim` nulo = versão aberta.
- Versões **não substituídas** de um empreendimento nunca se sobrepõem. O banco garante isso com
  uma constraint de exclusão adiável (`btree_gist`); a API planeja a mudança antes de gravar.
- **Mudança real** começa em `vigenciaInicio`. Se uma versão cobre a data, ela é fechada no dia
  anterior e a nova herda o fim dela (o fim informado só vale se igual ao dela). Sem versão que
  cubra a data, a nova vai até o dia anterior à próxima (ou fica aberta). Começar no mesmo dia de
  uma versão existente é recusado: o caso é **correção**.
- **Correção** mantém a vigência da versão corrigida e a **substitui**: grava uma nova linha com
  o mesmo intervalo e marca a anterior com `substituidaPorId`. A linha antiga é preservada,
  consultável e fora das consultas "vigente na data". Exige `motivo`. Só se corrige versão não
  substituída.
- **Retroativa:** mudança real com início anterior a hoje (`America/Sao_Paulo`) só é feita com
  escopo `todos` (equipe); o empresário recebe 403 `ALTERACAO_RETROATIVA_RESTRITA`. Correções
  valem para qualquer versão aberta do próprio empreendimento.
- Concorrência: a escrita serializa no empreendimento (`FOR UPDATE`) e a constraint é a rede de
  segurança; colisão no commit retorna 409 `VIGENCIA_CONFLITANTE`.
- O conteúdo de uma versão é imutável (gatilho): só `vigenciaFim`, `situacaoConferencia` e
  `substituidaPorId` mudam. `inventario_item` também não é atualizado.

## Estados dos campos (R02)

Cada campo de capacidade (`totalUh`, `leitos`, `maxLeitosPorUh`, `uhsPcd`, `funcFixos`,
`funcTemporarios`, `funciona24h`, `checkin`, `checkout`) tem `{ estado, valor }`:

| Entrada JSON                    | Estado          | Valor persistido                     |
| ------------------------------- | --------------- | ------------------------------------ |
| `10`, `0`, `false`, `"14:00"`   | `informado`     | coluna escalar (zero e falso contam) |
| `null`                          | `desconhecido`  | coluna nula + `estados[campo]`       |
| `{ "estado": "nao_se_aplica" }` | `nao_se_aplica` | coluna nula + `estados[campo]`       |
| `""`                            | `vazio`         | coluna nula + `estados[campo]`       |
| campo omitido                   | herda da base   | copia valor e estado da versão-base  |

A coluna JSONB `estados` guarda só os estados não informados. Dado legado (coluna nula sem
estado) é lido como `desconhecido`, sem inventar motivo. Nenhuma relação entre UH, leitos e
funcionários é presumida.

## Endpoints (sob `/api`, exigem `x-identification` igual ao `:id`)

| Método e caminho                                             | Permissão                                | Descrição                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/empreendimentos/:id/inventarios`                       | `inventarios:consultar`                  | Coleção OData (inclui substituídas): `id`, vigência, `totalUh`, `leitos`, `situacaoConferencia`, `tipoAlteracao`, `criadaEm`, `autor`, `substituidaPorId`. |
| GET `/empreendimentos/:id/inventarios/vigente`               | `inventarios:consultar`                  | `?data=AAAA-MM-DD` (padrão hoje) → versão vigente ou `data: null`.                                                                                         |
| GET `/empreendimentos/:id/inventarios/:versaoId`             | `inventarios:consultar`                  | Detalhe com capacidade (estado e valor) e itens com rótulo/pergunta **da versão do item**.                                                                 |
| POST `/empreendimentos/:id/inventarios`                      | `inventarios:criar`                      | Nova versão (201). `tipoAlteracao`, `vigenciaInicio`/`vigenciaFim` ou `corrigeId`+`motivo`, `capacidade`, `itens`.                                         |
| PUT `/empreendimentos/:id/inventarios/:versaoId/conferencia` | `inventarios:alterar` com escopo `todos` | `{ situacaoConferencia, motivo? }`.                                                                                                                        |

- Autoria e data vêm da sessão e do servidor; `criadaPor`/autor no corpo é recusado (400).
- **Itens:** as respostas enviadas são validadas com `validarRespostasCatalogo` (itens ativos);
  as não enviadas herdam da base. As regras de grupo valem para o conjunto final. Cada resposta
  nova referencia a versão atual do item; as herdadas mantêm a versão com que foram dadas.
- Versões novas nascem `pendente`. **Conferência** é decisão da equipe e não muda o conteúdo;
  `completo` exige UH e leitos informados (proposta técnica, não homologada). Versão substituída
  não se confere (409 `VERSAO_SUBSTITUIDA`).
- Auditoria (`inventario_versao`) na mesma transação: criação, fecho da versão anterior,
  substituição e conferência, com autor da sessão.

## Pendências

- R06 (vigência inclusiva/exclusiva, retroatividade, correção) e R02 (estados admissíveis por
  campo) dependem do OTO.
- Recálculo de indicadores ao mudar dados relevantes: parte 16 (não há registro de necessidade
  de recálculo ainda).
- Obrigatoriedade por contexto, legendas e dependências entre perguntas seguem pendentes.
- A constraint de exclusão exige a extensão `btree_gist` (disponível no PostgreSQL/PostGIS usado).
