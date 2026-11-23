# Importação de planilhas: recepção, leitura e prévia (parte 08)

Implementa a [parte 08](../plano/08-importacao-upload-leitura-e-parse.md). A leitura transforma
um arquivo em linhas brutas rastreáveis e em valores canônicos candidatos. **Não grava dados de
negócio**: conciliação com empreendimentos, confirmação e persistência são a parte 09.

## Fonte suportada

| Fonte                   | Planilha                                                                                | Aba lida    | Versão do mapeamento      |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------- | ------------------------- |
| `tabulacao_consolidado` | [Tabulação de ocupação consolidada](../planilhas/tabulacao-consolidadas-2026/README.md) | `TABULAÇÃO` | `tabulacao-consolidado/1` |

Cada família tem parser e fixture próprios. Inventário, Expectativa, diária média, controle de
pesquisas e BI **não** têm parser nesta entrega; não há reaproveitamento por semelhança de nome.

### Mapeamento da `TABULAÇÃO`

Lido somente o que é entrada primária; o restante é derivado (fórmulas) ou referência.

| Origem            | Conteúdo                                   | Destino na leitura                                |
| ----------------- | ------------------------------------------ | ------------------------------------------------- |
| `B2`              | título do período (texto livre)            | `rotuloPeriodo` (o período oficial é da parte 09) |
| `G59`             | quantidade de diárias (inteiro 1–60)       | `diarias`                                         |
| `C5:C44`          | nome do meio de hospedagem, como informado | `canonico.nomeInformado` (não é identidade)       |
| `L5:L44`          | % de taxa de ocupação                      | `canonico.ocupacaoPercentual` (string 0–100)      |
| `A5:A44`          | número de controle                         | preservado na linha bruta                         |
| `G`–`K`, `M`…     | UH, pesos, leitos médios, turistas         | ignoradas (calculadas; não viram respostas)       |
| `MH`, `ACUMULADO` | capacidade e resultados derivados          | abas ignoradas, listadas no resumo                |

O layout é conferido por âncoras: cabeçalhos da linha 4 (`CONTROLE`, `MEIO DE HOSPEDAGEM`,
`QTDE DE UH…`, `% TAXA DE OCUPAÇÃO`, `TOTAL NÚMERO TURISTAS PERÍODO`), `B45 = TOTAL MH RESP.` e
`B59 = QUANTIDADE DE DIÁRIAS…`. Divergência encerra a leitura com `CABECALHO_ALTERADO`; aba
ausente, com `ABA_AUSENTE`. Nada é inferido por posição aproximada.

### Regras de valor

- A escala do percentual é **explícita** ([contrato de dados](../plano/01-contrato-de-dados-e-regras.md)):
  célula numérica só vale se tiver formato de porcentagem (fração × 100); texto só vale com `%`.
  Número comum (`0.75`, `75`, `1`) ou texto sem `%` → `ESCALA_AMBIGUA`, nunca zero ou aceito por acaso.
- Texto com separador de milhar/decimal ambíguo (`1.250%`) ou fora de 0–100 → `VALOR_INVALIDO`.
- Ocupação vazia é **ausência**, diferente de `0%` informado (`OCUPACAO_AUSENTE`, aviso).
- Fórmula é lida pelo valor **armazenado**, sem recalcular: com valor → `FORMULA_EM_ENTRADA`
  (aviso); sem valor → `FORMULA_SEM_VALOR` (erro); erro de célula (`#DIV/0!`) → `VALOR_DE_ERRO`.
- Nome ausente (`NOME_AUSENTE`, erro) e repetido sem acento/caixa (`NOME_DUPLICADO`, aviso).
- Células mescladas nas colunas de entrada → `LAYOUT_DESCONHECIDO`.
- Ruído binário de ponto flutuante (`0.7500000000000001`) é removido em 10 casas; nenhum
  valor real é arredondado além disso.

## Segurança do arquivo

Somente `.xlsx` (pacote OOXML). Macros (`vbaProject.bin`), vínculos externos, `.ods`, `.xls` e
conteúdo não zip são recusados com código estável. Limites: 5 MB de arquivo, 300 entradas e
64 MB descompactados no pacote, 2.000 caracteres por célula, 5.000 linhas persistidas. Nada é
executado nem recalculado. O nome enviado é rótulo de exibição; o original fica em
`importacao_arquivo` (restrito) e **nenhum endpoint o devolve**.

## Endpoints

Todos sob `/api`, autenticados, recurso de acesso `importacoes`
([matriz](acesso.md): administrador e gestor; estagiário, visualizador e empresário não têm acesso).
Escritas exigem `Origin` do frontend e `X-OTO-Request: 1` (a regra aceita `application/json` ou
`application/octet-stream`; ambos exigem preflight CORS).

| Método e caminho                   | Permissão | Entrada / saída                                                                                                       |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| POST `/importacoes?fonte=`         | criar     | Corpo binário `.xlsx`; cabeçalho `x-nome-arquivo` (URL-encoded). 201 com o lote já lido (`estado` `lido` ou `erro`).  |
| GET `/importacoes`                 | consultar | Coleção OData de lotes: `id`, `fonte`, `nomeArquivo`, `tamanhoBytes`, `versaoParser`, `estado`, `criadoEm`, `lidoEm`. |
| GET `/importacoes/:id`             | consultar | Detalhe: acrescenta `sha256`, `erroMensagem`, `resumo` da leitura e `totais` (`linhas`, `erros`, `avisos`).           |
| GET `/importacoes/:id/linhas`      | consultar | Coleção OData: `aba`, `linha`, `tipo` (`cabecalho`/`entrada`), `situacao`, `celulas` brutas e `canonico`.             |
| GET `/importacoes/:id/ocorrencias` | consultar | Coleção OData: `aba`, `linha`, `coluna`, `severidade`, `codigo`, `mensagem`, `orientacao`.                            |
| POST `/importacoes/:id/leituras`   | alterar   | Refaz a leitura do original preservado; 200 com o detalhe.                                                            |

Erros: 400 `ENTRADA_INVALIDA` (fonte, nome ou corpo), 413 `ARQUIVO_MUITO_GRANDE`, 409
`ARQUIVO_JA_RECEBIDO` (mesma fonte e SHA-256; `details[0].message` traz o `loteId`) e 409
`LEITURA_EM_ANDAMENTO`. Arquivo ilegível ou fora do layout **é recebido**: o lote fica em
`erro`, com ocorrência acionável, e a leitura pode ser refeita.

## Estados e recuperação

`recebido` → `lendo` → `lido` (prévia gerada, mesmo com erros por linha) ou `erro` (arquivo ou
layout recusado). A leitura roda fora da transação e só grava linhas e ocorrências ao final, em
uma transação que também registra a auditoria (`importacao_lote`). Uma leitura `lendo` há mais de
2 minutos é tratada como interrompida e pode ser refeita. Reler substitui apenas linhas e
ocorrências do próprio lote. Repetir o upload do mesmo arquivo não cria outro lote.

`importacao_linha` guarda, por aba/linha, as células de origem (`bruto`, `tipo`, `formula`,
`formatoPercentual`) e o canônico candidato. Estas tabelas não são consumidas por indicadores.

## Limitações conhecidas

- Datas seriais não são convertidas: a fonte implementada não tem datas de entrada. O parser
  de inventário e o de diária média precisarão tratá-las (e `date1904`) com testes próprios.
- A planilha original oficial é um esqueleto sem respostas; os testes usam fixtures fictícias
  no mesmo layout ([fixtures/oto/importacao](../../fixtures/oto/importacao/README.md)).
- Mapeamento, limites e regras de escala aguardam homologação do OTO.
