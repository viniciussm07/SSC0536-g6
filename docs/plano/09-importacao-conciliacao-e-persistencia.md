# 09 — Importação: validação, conciliação e persistência

**Situação:** implementação parcial para as famílias **Tabulação Consolidado e Expectativa**
(destino, conciliação por decisão, plano, confirmação transacional, CSV de rejeições). Demais famílias
e criação de empreendimentos por importação seguem planejadas. Contrato em
[docs/contratos/importacao.md](../contratos/importacao.md). Políticas são hipóteses da POC, sem homologação do OTO.

**Rastreabilidade:** RF04–RF08 e RF35; RNF09 e RNF10.

**Dependências:** [04](04-cadastro-de-empreendimentos.md), [06](06-inventario-versionado.md), [07](07-auditoria-de-alteracoes.md), [08](08-importacao-upload-leitura-e-parse.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).

Validar conciliação com códigos fictícios consistentes entre arquivos. Distinguir entradas, controles e totais derivados para evitar dupla contagem.

## Objetivo

Incorporar dados aprovados à base central sem duplicidade, perda de histórico ou transcrição manual.

## Backend e dados

- Aplicar validação de domínio sobre as linhas canônicas; separar válida, inválida e pendente
  de conciliação, preservando erro e origem. Lotes de respostas também dependem das partes 10–13.
- Conciliar IDs legados, empreendimentos e períodos com critérios aprovados. CNPJ/nome isolados
  não autorizam fusão automática. Guardar decisões manuais e sua reutilização em futuros lotes.
- Definir política de criação/atualização, conflito entre fontes e entre alteração manual/importada,
  registros ausentes no arquivo e possibilidade de importação parcial. Ausência não significa exclusão.
- Exibir plano de alterações antes da confirmação: novos, atualizados, sem mudança, rejeitados e conflitos.
- Implementar idempotência por fonte, versão/checksum e identidade do registro; tratar nova versão
  do mesmo arquivo e correções sem duplicar respostas ou versões do inventário.
- Persistir por transação/unidade de lote aprovada; gravar auditoria e proveniência e marcar
  necessidade de recálculo. Não publicar indicadores com dados pendentes.
- Definir estados, reprocessamento, retomada e compensação de lotes. Preservar trabalhos confirmados
  e não prometer desfazer importações com exclusões que apaguem alterações posteriores.

## Frontend

Tela de conferência e resolução de correspondências, seleção explícita de conflitos,
confirmação com totais, consulta do resultado e download autorizado de rejeições.
Exibir falha parcial quando essa política for permitida, nunca sucesso integral enganoso.

## Critérios de aceite e testes

- Reimportar a mesma fonte não duplica empreendimentos, respostas ou inventários.
- Ambiguidade não associa dados ao estabelecimento errado; exige decisão autorizada.
- Linhas aprovadas preservam origem, regra aplicada e responsável pela confirmação.
- Falha de persistência não deixa transação incompleta nem lote marcado como finalizado indevidamente.
- Totais de lidas, aceitas, inalteradas, rejeitadas e pendentes reconciliam com o arquivo.
- Alteração retroativa segue as regras de versão e recálculo, sem sobrescrever publicação histórica.

## Estado da implementação

**Entregue (conclusão técnica, com dados fictícios):**

- Migration `20261127000000_importacao_conciliacao`: destino e estado de confirmação no lote,
  `importacao_decisao`, `importacao_correspondencia` (reuso de decisões manuais) e
  `importacao_aplicacao` (proveniência: valor anterior/novo, regra, responsável).
- Backend `apps/backend/src/importacoes`: planejador puro e determinístico (`plano.ts`), serviço de
  conciliação/confirmação e controller; confirmação em uma transação com bloqueio por edição,
  plano recalculado dentro do bloqueio e conferência dos totais exibidos.
- Políticas: nome nunca vincula sozinho; ausência no arquivo não exclui; ausência de ocupação não vira
  zero; conflito exige escolha explícita; público congelado respeitado; importação parcial permitida
  e sinalizada; reimportação não duplica; `recalculoPendente` sinaliza o recálculo (parte 16).
- Frontend: seleção do destino, plano com totais, vínculo por decisão, resolução de conflito,
  confirmação com totais, resultado parcial/concluído e download de rejeições.

**Critérios de aceite × evidência (testes):**

| Critério                                              | Teste                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Reimportar não duplica                                | `conciliacao.integration`: reconfirmação idempotente; nova versão do arquivo |
| Ambiguidade exige decisão autorizada                  | `plano-importacao` e integração: sugestão não vincula; só decisão manual     |
| Origem, regra e responsável preservados               | integração: `importacao_aplicacao` + auditoria da resposta                   |
| Falha não deixa transação incompleta nem lote marcado | integração: gatilho de falha em `importacao_aplicacao`, depois retomada      |
| Totais reconciliam                                    | `plano-importacao` (soma das 7 situações) e integração                       |
| Retroativo sem sobrescrever publicação                | só `recalculoPendente`; nenhum indicador é tocado                            |

**Pendências e limites:** aprovação do OTO das políticas (criar/atualizar, conflito, parcial); parsers e
destinos das demais fontes (inventário versionado exige regras da parte 06); criar empreendimento a partir
do arquivo; consumo do sinal de recálculo (parte 16); lista de vínculo limitada a 100 empreendimentos
na tela; sem rotina de desfazer lote.

**Próximo passo:** partes 10–13 já fornecem edições e respostas; o próximo ganho é o parser e a
conciliação de inventário (06) e o consumo de `recalculoPendente` pela parte 16.

**Expectativa:** o destino exige edição `expectativa`; as correspondências decididas são compartilhadas com a
Consolidado; a confirmação grava a resposta da edição de expectativa (`canal = importacao`, regra
`tabulacao-expectativa/1:…`) sem tocar a Consolidado. Pendentes do OTO: antecedência, data de corte e correção.
