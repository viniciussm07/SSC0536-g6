# Matriz de transformação das fontes

Versão técnica 1, inspeção em 15/11/2026. Arquivos e hashes estão nos READMEs vinculados.
Leitura dos XML ODS/XLSX sem preencher, recalcular ou salvar os originais. Foram
conferidos cabeçalhos e precedentes representativos, não todas as fórmulas de todas as abas.

**Entrada** é observação primária; **controle** descreve operação; **derivado** depende
de entradas. Derivados podem ser conferidos ou preservados como legado com proveniência,
mas nunca fabricados como novas respostas individuais.

## Inventário

Fonte: [inventário ODS/XLSX](../planilhas/inventario-oficial-olimpia/README.md), duas
representações da mesma origem. O [dicionário](dicionario-inventario.md) detalha cada
campo inicial da aba real `MEIOS DE HOSPEDAGEM `, com espaço final.

| Fonte/localizador e papel             | Transformação e destino                                    | Validação e exemplo de teste                               |
| ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| C5/W5/V5/Y5/AA5, entrada              | texto/data → `Empreendimento`                              | C01/C10 da fixture; não fundir homônimos                   |
| E5/G5:H5/AG5:AK5, entrada             | contato tipado/finalidade conferida → `Contato`            | `pesquisas@example.test`; não criar usuário                |
| AN5:AP5, entrada                      | presença + número + vencimento → candidato `Cadastur`      | 0 é falso, vazio é vazio; 1 sem número pede conferência    |
| AQ5:AU5, entrada                      | inteiros ≥0 → `InventarioVersao`                           | C02/C03/C06–C09; preservar estados antes da gravação       |
| AV5:AW5, entrada                      | booleano/horários separados após conferir legenda → versão | C11 testa horário adaptado, não a separação de AW          |
| AX5:HC5, entrada                      | grupo + coluna + opção → catálogo versionado/itens         | “Não” com opção positiva exige regra na parte 05           |
| RHC!A5/T5/U5, entrada para agregado   | deduplicação/período aprovados → `RhcPeriodo`              | 3 RHC fictícias/12 leitos a revisar; sem CPF/proprietários |
| DADOS CONSOLIDADOS/CADASTUR, derivado | conferência de totais; sem nova entidade                   | teste futuro: total e detalhes não duplicam contagem       |

## Consolidado e Expectativa

Fontes: [Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md) e
[Expectativa](../planilhas/tabulacao-expectativa-2026/README.md), arquivos distintos.
Cabeçalhos equivalentes observados não autorizam combinar edições ou instrumentos.

| Fonte/localizador e papel                   | Nome canônico, tipo/unidade, transformação e destino                                           | Validação e teste                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| MH!B1/L1, referência                        | `referenciaEmpreendimento`/`tipoHospedagem`, texto → conciliação                               | nome semelhante pede confirmação; não criar empresa por nome                                  |
| MH!D1/E1, referência                        | `totalUh`/`leitos`, inteiros → confronto com versão de inventário                              | 10 UH/20 leitos fictícios; divergência não sobrescreve histórico                              |
| MH!G1:I1, referência pendente               | `leitosReferencia`, `minimo`, `maximo` → sem destino automático                                | confirmar se G é máximo/UH; H sem campo próprio                                               |
| MH!F2/J2/K2/M2, derivado                    | médias/leitos ajustados/peso → metodologia futura                                              | F2 divide E2/D2; J2 usa (H2+I2)/2; K2 usa D2*J2; M2 usa D2/C91. Confirmar denominador/unidade |
| TABULAÇÃO!B2, controle                      | `titulo`, texto → `Pesquisa.titulo`; tipo de coleta vem da fonte conferida                     | calendário não se extrai só do título                                                         |
| TABULAÇÃO!B4/C4, controle/empresa           | referência de linha/empresa → associação com `Resposta.empreendimentoId`                       | B não é chave global; vínculo autorizado obrigatório                                          |
| TABULAÇÃO!L4 e coluna L individual, entrada | `ocupacaoPercentual`, decimal string 0–100 → `RespostaItem.valorNumerico` com pergunta/período | `"0.75"` em escala fração → `"75"`; zero é resposta, vazio não gera resposta                  |
| TABULAÇÃO!G5:K5, derivado                   | lookup de capacidade/pesos → referências de cálculo                                            | `IFERROR(...,"0")` não autoriza converter empresa ausente em capacidade zero                  |
| TABULAÇÃO!M5/R5:U5, derivado                | fluxo/cobertura → `IndicadorResultado` após aprovação                                          | M não é resposta; R não é total de hotéis cadastrados                                         |
| Consolidado TABULAÇÃO!B97, nota             | day use → `ParametroCalculo` com origem/vigência                                               | Demanda 2024 ausente; não fixar valor padrão                                                  |
| ACUMULADO / ACUMULADO MENSAL, derivado      | saídas/boletim → consumo/legado com origem                                                     | C5 referencia TABULAÇÃO!J48; não somar aos L individuais                                      |
| Expectativa, CÁLCULO DA RECEITA ESTIMADA    | dependências futuras, fora do primeiro recorte                                                 | preço ofertado não comprova receita realizada                                                 |

Perguntas, opções, obrigatoriedade e unidade da resposta original permanecem pendentes.
O contrato 0–100 não afirma a escala original. `Pesquisa.tipoColeta` admite
expectativa/consolidado; `PesquisaCampo.tipoValor`, percentual/texto/escolha. IDs de
modelo, pergunta e período são obrigatórios ao persistir. Autoria, canal e momento da
resposta não se inferem de capacidade/título. Não há instrumento completo de coleta no recorte.

## Controle de pesquisas

Fonte: [controle operacional ODS](../planilhas/controle-pesquisas/README.md).

| Fonte/localizador e papel                    | Transformação e destino/lacuna                                                                                             | Validação e exemplo                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 2026!A2/B2/G2/H2, controle/nome/data/revisão | `codigoEdicao`, `titulo`, `dataEdicao`, `dataRevisao` → metadados de edição/proveniência; código/revisão sem campo próprio | data não é automaticamente abertura/prazo                             |
| Controle MH 2026!B2/C2/E2/F2, controle       | nome/contato/proprietário/telefone → conciliação                                                                           | hotel fictício/contato example.test; sem credenciais automáticas      |
| Controle MH 2026!D2, 1=SIM 0=NÃO             | `aceitaParticipar`, booleano → preferência/elegibilidade ainda sem modelo                                                  | C04/C05 exercitam essa legenda; não é opt-in de boletim               |
| Controle MH 2026!G2:I2, edições              | relacionar controle legado e pesquisas por período/tipo                                                                    | I2 mistura Consolidado e Expectativa; suspender até definir separação |
| Marcações nas colunas de edição e totais W2  | marcação → conferência; totais derivados                                                                                   | 1 não vira 100% de ocupação nem prova resposta; legenda pendente      |

## Diária média

Fonte: [diária XLSX](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
Moeda/impostos/protocolo dependem de confirmação. Não preencher dados obrigatórios
ausentes usando data atual ou outros campos por conveniência.

| Fonte/localizador e papel                            | Transformação e destino                                               | Validação e exemplo                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| JANEIRO 2026!B4/C4, empresa/tipo                     | texto → conciliação com cadastro/categoria                            | nome não é ID; categoria aprovada                                                          |
| JANEIRO 2026!D4:AH4, datas                           | calendário Excel conforme sistema 1900/1904 → candidato `dataEstadia` | D4 contém serial; confirmar que é estadia, não coleta; validador ISO recusa serial cru     |
| JANEIRO 2026!D:AH, linhas individuais                | `valorDiaria`, decimal string → `ColetaDiaria.valorDiaria`            | `"250,50"` → `"250.5"`; number JS recusado para preservar precisão; ausência não vira zero |
| B1:B2, protocolo/fonte                               | metadados versionados e `fonte` → coleta após classificação           | Booking e sites próprios; `empresario` no MER não equivale a site próprio                  |
| Sem coluna inequívoca no recorte                     | `dataColeta`, `periodoId`, `tipoDia` → obrigatórios no MER            | não copiar estadia para coleta; semana/fim de semana exige protocolo                       |
| AI6/AJ6, média/ranking; EVOLUÇÃO MENSAL - 2026!B2:B4 | derivado e descrição de amostra → metodologia/consumo                 | AI6 usa AVERAGE(D6:AH6); 80 leitos não é limiar universal do cadastro                      |
| FERIADOS!D4:M4                                       | datas → recorte aprovado                                              | nome da aba não certifica feriado oficial                                                  |

## Indicadores/BI

Fonte: [indicadores ODS](../planilhas/indicadores-turismo-2017-2025-bi/README.md).
Saída agregada, não novas observações de hospedagem.

| Fonte/localizador e papel                          | Transformação e destino                                 | Validação e exemplo                                                          |
| -------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Taxa Ocupação Hoteleira - Consolidado Mensal!B9:L9 | mês/ano → `Periodo` e resultado legado com fonte/método | escala confirmada; não fabricar RespostaItem                                 |
| Total Leitos Meios de Hospedagem!B9:L9             | mês/ano → agregado legado de capacidade                 | não somar ao inventário individual; cobertura/versionamento pendentes        |
| Diária Média Meios De Hospedagem – Hotel!B9:L9     | mês/tipo de média/ano → resultado por método/recorte    | aritmética/ponderada distintos; conferir demais layouts antes de generalizar |
| Controle de Indicadores                            | definições dos indicadores selecionados                 | sem ampliar para outras frentes das 51 abas                                  |

Novos resultados exigem definição (código/nome/unidade/versão), período, coleta, recorte,
método, valor decimal e timestamp segundo o MER. Para legados, faltam estado/proveniência
e publicação suficientes: parte 16 deve evoluir o modelo antes da carga. Não inventar
linhagem com inventários/parâmetros inexistentes.

## Evidências e testes previstos

- C01–C11 em [contrato-dados.json](../../fixtures/oto/contrato-dados.json) são exemplos
  sintéticos por cabeçalho real, executados em ESM/CJS no common. Comprovam normalização
  de valores decodificados, não leitura de arquivo.
- A mesma suíte recusa quantidades negativas/fracionárias, datas impossíveis, marcadores
  desconhecidos, perda de precisão e escala inválida; preserva zero/falso.
- Partes 05/08–09 testarão totais, mesclagens, nomes de abas com espaço final, diferenças
  ODS/XLSX, marcadores por versão, homônimos e conferência de origem.
- Partes 06/12/15–17 testarão vigência/concorrência, edições mistas, prazos, protocolo,
  fórmula, não respondentes, day use e agregados legados. Testes previstos não comprovam
  implementação nem metodologia homologada.
