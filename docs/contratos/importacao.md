# Importação de planilhas: leitura, conciliação e confirmação (partes 08 e 09)

Implementa as partes [08](../plano/08-importacao-upload-leitura-e-parse.md) (leitura) e
[09](../plano/09-importacao-conciliacao-e-persistencia.md) (conciliação e confirmação). A leitura transforma
um arquivo em linhas brutas rastreáveis e em valores canônicos candidatos. **Não grava dados de
negócio**: conciliação com empreendimentos, confirmação e persistência são a parte 09.

## Fonte suportada

| Fonte                   | Planilha                                                                                | Aba lida    | Versão do mapeamento      |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------- | ------------------------- |
| `tabulacao_consolidado` | [Tabulação de ocupação consolidada](../planilhas/tabulacao-consolidadas-2026/README.md) | `TABULAÇÃO` | `tabulacao-consolidado/1` |

Cada família tem parser e fixture próprios. Inventário, diária média, controle de
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

Somente `.xlsx` (pacote OOXML). Macros (`vbaProject.bin`), `.ods`, `.xls` e
conteúdo não zip são recusados com código estável; vínculos externos são aceitos com aviso e nunca seguidos. Limites: 5 MB de arquivo, 300 entradas e
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

## Conciliação e confirmação (parte 09)

Escopo: a fonte `tabulacao_consolidado` vira `resposta` + `resposta_item` de uma **edição consolidada**
já existente. Políticas abaixo são **hipóteses de trabalho da POC**, aguardando aprovação do OTO.

### Fluxo

1. **Destino** (`PUT /importacoes/:id/destino`): escolhe a edição do tipo da fonte (`consolidado` ou `expectativa`, aberta,
   expirada ou encerrada; rascunho e agendada são recusadas) e a pergunta cujo campo é `percentual` na
   versão do modelo da edição. O **período** vem da pergunta; título e diárias do arquivo só geram
   avisos de conferência (`B2`/`G59` versus as datas do período). O destino trava na primeira aplicação.
2. **Correspondência de empreendimentos.** Nome ou CNPJ isolados **nunca** vinculam sozinhos: sem decisão,
   a linha fica `pendente` e o servidor oferece _candidatos_ (nome igual ou parecido a nome fantasia e
   razão social) só como sugestão. Uma pessoa vincula (`PUT .../linhas/:linhaId/decisao`
   `{tipo: "vincular", empreendimentoId}`) ou rejeita (`{tipo: "rejeitar", motivo?}`); `DELETE` desfaz a
   decisão. Cada vínculo manual grava uma **correspondência** (`importacao_correspondencia`, por fonte e
   nome normalizado) que vale como decisão em lotes futuros (`origemDecisao: correspondencia_salva`); a
   decisão da linha sempre prevalece. A correspondência é compartilhada entre Consolidado e Expectativa (grupo
   `tabulacao`; as duas listam os mesmos meios de hospedagem). Rejeições não são memorizadas.
3. **Plano de alterações** (`GET /importacoes/:id/plano`): recalculado do estado real a cada chamada.
   Cada linha lida cai em uma só situação, e as sete somam `lidas`:

| Situação      | Significado                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `novo`        | Empreendimento sem resposta na edição: será criada (`canal = importacao`).                                              |
| `atualizar`   | Resposta existente sem esta pergunta (acrescenta) ou com valor diferente e `substituir`.                                |
| `sem_mudanca` | Mesmo valor já gravado (comparação decimal, `75.50` = `75.5`).                                                          |
| `conflito`    | Valor diferente do gravado, sem escolha: exige `PUT .../conflito` `{resolucao}`.                                        |
| `rejeitado`   | Erro de leitura, sem ocupação (ausência não é zero), rejeição manual, fora do público congelado, ou `manter` existente. |
| `pendente`    | Sem correspondência, sem destino ou empreendimento repetido no lote.                                                    |
| `aplicado`    | Já confirmada neste lote (`acaoAplicada`).                                                                              |

Empreendimentos que existem na edição mas **não aparecem no arquivo não são tocados**: ausência não é
exclusão. O plano é um relatório limitado a 5.000 linhas, não uma coleção paginada. 4. **Confirmação** (`POST /importacoes/:id/confirmacoes` `{novos, atualizados}`): exige `importacoes:alterar`
e `respostas:criar` e `respostas:alterar` com escopo global. Os totais enviados são os da tela; se o plano
mudou, `409 PLANO_DESATUALIZADO`. A gravação roda em **uma transação** com bloqueio por edição
(`pg_advisory_xact_lock`), recalcula o plano dentro do bloqueio e aplica `novo`, `atualizar` e
`sem_mudanca`. Pendentes e conflitos **não** são aplicados: o lote fica `parcial`; sem pendências nem
conflitos, `concluido`. Falha em qualquer linha desfaz tudo e o lote não é marcado.
Reconfirmar é idempotente (linhas aplicadas não se repetem).

### Proveniência, auditoria e recálculo

Cada linha aprovada gera `importacao_aplicacao` (valor anterior e novo, ação, regra
`<versão do parser>:decisao-manual|correspondencia-salva`, quem e quando confirmou) e auditoria da
`resposta` (`criar`/`alterar`, com antes e depois) e do lote. O `usuarioId` da resposta é quem confirmou.
Em atualização a resposta mantém seu `canal` original; a mudança fica na aplicação e na auditoria.
`recalculoPendente` no lote sinaliza respostas alteradas; nenhum indicador é recalculado ou
publicado aqui (parte 16), e resultados históricos não são reescritos.

### Reimportação e novas versões

O mesmo arquivo (fonte + SHA-256) não gera outro lote. Uma **nova versão** do arquivo é outro lote: linhas
iguais viram `sem_mudanca` (via correspondências salvas), diferentes viram `conflito` até haver escolha, e
nada duplica respostas.

### Endpoints adicionais

| Método e caminho                                  | Permissão | Descrição                                                                                                                                                                                    |
| ------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUT `/importacoes/:id/destino`                    | alterar   | `{pesquisaId, perguntaId}` → plano. 409 `DESTINO_INCOMPATIVEL`/`DESTINO_TRAVADO`/`LOTE_NAO_LIDO`.                                                                                            |
| GET `/importacoes/:id/plano`                      | consultar | `{loteId, destino, confirmacao, avisos, podeConfirmar, totais, itens}`.                                                                                                                      |
| PUT `/importacoes/:id/linhas/:linhaId/decisao`    | alterar   | `vincular` ou `rejeitar` → plano. 409 `LINHA_APLICADA`.                                                                                                                                      |
| DELETE `/importacoes/:id/linhas/:linhaId/decisao` | alterar   | 204; 404 sem decisão.                                                                                                                                                                        |
| PUT `/importacoes/:id/linhas/:linhaId/conflito`   | alterar   | `{resolucao: substituir\|manter}` → plano. 409 `SEM_VINCULO`/`SEM_CONFLITO`.                                                                                                                 |
| POST `/importacoes/:id/confirmacoes`              | alterar   | `{novos, atualizados}` → `{confirmacao, criadas, atualizadas, semMudanca, pendentes, conflitos, rejeitadas, recalculoPendente}`. 409 `PLANO_DESATUALIZADO`/`NADA_A_CONFIRMAR`/`SEM_DESTINO`. |
| GET `/importacoes/:id/rejeicoes`                  | exportar  | CSV (UTF-8 com BOM, `;`) das linhas rejeitadas, pendentes e em conflito.                                                                                                                     |

### Limitações da parte 09

- Só as duas tabulações têm destino definido; inventário e demais fontes aguardam seus parsers.
- Expectativa: antecedência da coleta, data de corte e política de correção de respostas seguem pendentes do OTO;
  comparar Expectativa com Consolidado exige mesma população e versão de fórmula (regra ainda não definida).
  Uma resposta de Expectativa e uma de Consolidado coexistem porque cada edição tem a sua.
- Retomada = repetir a confirmação (aplicada linha a linha de forma idempotente); não há desfazer: respostas
  já gravadas só mudam por nova importação ou pelo fluxo normal, para não apagar alterações posteriores.
- A tela lista até 100 empreendimentos para vínculo manual (sugestões vêm do servidor sem esse limite).
- Criação de empreendimentos por importação não existe: sem correspondência, a linha fica pendente.
