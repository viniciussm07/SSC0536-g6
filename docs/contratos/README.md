# Contrato canônico de dados OTO — versão técnica 1

Implementação da [parte 01](../plano/01-contrato-de-dados-e-regras.md), baseada no
[catálogo de fontes](../planilhas/README.md), no
[MER implementado](../../apps/backend/prisma/schema.prisma) e nas
[decisões do modelo](../../apps/backend/prisma/README.md). RF03, RF05–RF08, RF22 e RF35;
RNF09 e RNF12, conforme a numeração do Plano v4.

Este contrato prepara o primeiro incremento de hospedagem. Regras técnicas estão
implementadas e testadas; a aprovação de campos, regras de negócio e recorte pelo OTO
permanece pendente. Nenhum parser, endpoint de negócio ou formulário é entregue nesta
parte. Não há migração antecipada nem alteração dos arquivos de referência.

- [Auditoria de alterações](auditoria.md): consulta administrativa, proveniência, snapshots e proteção de eventos (parte 07).
- [Consultas de coleção (OData)](odata.md): `$filter`, `$orderby`, `$top`, `$skip` e `$count` em toda listagem.
- [Cadastro de empreendimentos](cadastro.md): endpoints, entrada, duplicidade, escopo e auditoria da parte 04.
- [Inventário versionado](inventario.md): vigência sem sobreposição, correção por substituição, estados dos campos e conferência (parte 06).
- [Catálogos e formulário de inventário](catalogos.md): grupos, itens versionados, regras de seleção e carga v1 (parte 05).
- [Metodologia dos indicadores](indicadores.md): fichas da fórmula v1, parâmetros-hipótese e pendências de homologação (parte 15).
- [Fontes complementares](fontes-complementares.md): coleta manual de diária, RHC e parâmetros com conferência (parte 17).
- [Dicionário inicial do inventário](dicionario-inventario.md): origem, nome canônico,
  destino Prisma, tipos, unidades, obrigatoriedade e exemplos.
- [Matriz das seis fontes](matriz-fontes.md): transformação, validação, lacunas e testes.
- [Regras, pendências e evolução](regras-e-evolucao.md): versão, responsabilidade,
  impacto histórico, migrations futuras e recorte do primeiro incremento.

## Execução do contrato

Os normalizadores portáveis estão na superfície pública de
[`@ssc0536/common`](../../common/README.md), domínio `coleta`. Entrada manual e célula
decodificada usam as mesmas funções. A leitura de arquivo, identificação de linhas,
conciliação e persistência pertencem às partes 08–09. DTOs e autorização ficam no
servidor nos respectivos fluxos; a validação do common não prova acesso nem substitui
whitelist HTTP, validação de obrigatoriedade ou regras entre entidades.

```ts
import { normalizarQuantidadeColetada } from '@ssc0536/common';

normalizarQuantidadeColetada('0');
// { valido: true, data: { estado: 'informado', valor: 0 } }
normalizarQuantidadeColetada({ estado: 'nao_se_aplica' });
// { valido: true, data: { estado: 'nao_se_aplica' } }
normalizarQuantidadeColetada('1,5');
// { valido: false, erro: { code: 'VALOR_INVALIDO', message: '...' } }
```

O resultado é um **candidato à conferência**, não um DTO Prisma nem uma autorização de
gravação. Falhas retornam código/mensagem sem repetir o conteúdo da célula. O consumidor
associa campo e localizador, preserva a origem sob o acesso autorizado e apresenta o erro
no envelope de negócio do [AGENTS.md](../../AGENTS.md).

O domínio `inventario/` publica `CapacidadeInventarioColetada` e
`normalizarCapacidadeInventario`: UH, leitos, máximo por UH, UH PCD, funcionários,
funcionamento 24h e horários. O objeto usa nomes canônicos, rejeita campos alheios,
agrega erros por campo e preserva omissões. Não impõe relações entre métricas ou
admissibilidade de não se aplica ainda não homologadas. Receber um candidato válido
não libera sua gravação nem aceita autoria fornecida no payload.

## Estados de entrada

| Entrada decodificada                                | Estado canônico            | Significado                                                   |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `undefined` ou campo omitido                        | `ausente`                  | Campo/célula não fornecido; em atualização não implica apagar |
| `""` ou só espaços                                  | `vazio`                    | Campo fornecido sem preenchimento                             |
| `null`                                              | `desconhecido`             | Valor explicitamente desconhecido                             |
| `{ "estado": "nao_se_aplica" }`                     | `nao_se_aplica`            | Declaração explícita, sujeita à admissibilidade no campo      |
| `0`, `"0"` em quantidade                            | `informado`, valor `0`     | Quantidade conhecida igual a zero                             |
| `false`, `"não"`, `0` em campo com legenda booleana | `informado`, valor `false` | Resposta negativa conhecida                                   |

Todos os estados podem ser passados explicitamente como `{ estado: ... }`; `informado`
exige `valor` válido. Propriedades adicionais são rejeitadas. Marcadores livres (`-`,
`N/A`, `X`) não ganham semântica global: são texto em campo textual e erro nos demais
campos, até existir dicionário específico da fonte. O parser deve distinguir célula ausente
e explicitamente vazia quando o formato permitir; não fabricar essa distinção se perdida.

A parte 06 preserva esses estados em `inventario_versao.estados` (JSONB): a coluna escalar fica
nula e o estado (`desconhecido`, `nao_se_aplica`, `vazio`) é gravado ao lado; zero e falso são
sempre valores informados. Ver [inventário versionado](inventario.md). Uma leitura de `null`
legado (sem estado gravado) não permite reconstruir o motivo da ausência e é lida como
`desconhecido`.

## Convenções técnicas

- Versão exportada: `CONTRATO_DADOS_VERSAO = 1`. Alterações de significado exigem versão
  e compatibilidade explícitas; não reinterpretar registros legados silenciosamente.
- Fuso operacional proposto para a POC: `America/Sao_Paulo`, exportado como
  `FUSO_OPERACIONAL`. Datas civis são `YYYY-MM-DD`, sem deslocamento UTC; horários são
  `HH:mm`. Timestamps de API usam ISO 8601 em UTC. Prazos operacionais dependem da parte 12.
- Texto: aparar só espaços externos, preservar grafia, acentos e caixa. Não remover
  pontuação do endereço nem usar nome normalizado como identidade.
- Quantidade: inteiro de 0 a 2147483647, limite técnico do `Int` PostgreSQL. Nenhum
  limiar de 80 leitos, relação UH/leitos ou teto de negócio é homologado por esse limite.
- Decimais exatos: strings não negativas, ponto canônico, até 35 dígitos inteiros e 30
  fracionários, compatíveis com o Decimal atual. Entrada aceita ponto **ou** vírgula
  decimal, sem moeda, milhar ou notação científica. `number` é recusado para evitar perda
  de precisão. Remover zeros finais não arredonda o valor.
- Percentuais canônicos: strings decimais na escala **0–100**. A função exige escala de
  origem `fracao` (0–1) ou `percentual` (0–100), nunca adivinha pela magnitude. `0.5`
  significa `50` na primeira e `0.5` na segunda. A leitura de XLSX deve obter decimal
  sem perda antes de normalizar. Fórmulas em cache não se tornam respostas primárias.
- Sem arredondamento de negócio nesta parte. Arredondar na apresentação após definir
  casas e método; não inferir média, peso, denominador ou fórmula a partir do contrato.
- Seriais Excel, datas localizadas e campos combinados de horário precisam de adaptação
  específica e metadados da fonte; os validadores não fazem conversões ambíguas.

## Evidência reproduzível

[`contrato-dados.json`](../../fixtures/oto/contrato-dados.json) contém exemplos sintéticos
por cabeçalho real. Não altera `scenario.json` nem o hash do seed. Os
[testes do contrato](../../common/test/coleta/valor-coletado.validators.test.mjs) verificam
paridade manual/importada, estados, limites, calendário, decimais e escala percentual
nos dois formatos publicados (ESM/CommonJS). Isso comprova normalização de valores
decodificados, não a leitura de ODS/XLSX ou homologação de fórmulas pelo OTO.
