# Metodologia dos indicadores — fichas da fórmula v1

Implementação da [parte 15](../plano/15-metodologia-dos-indicadores.md). As fichas
transcrevem as fórmulas encontradas nos esqueletos de
[Consolidado 2026](../planilhas/tabulacao-consolidadas-2026/README.md),
[Expectativa 2026](../planilhas/tabulacao-expectativa-2026/README.md) e
[diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).

**Nenhuma fórmula, parâmetro ou resultado deste documento foi homologado pelo OTO.**
A transcrição mostra como a planilha calcula hoje; não prova que esse é o método oficial.
As divergências entre a planilha e o código estão listadas em cada ficha e reunidas em
[Pendências de homologação](#pendências-de-homologação).

O cálculo está em [`@ssc0536/common`](../../common/README.md), domínio `indicadores`:
funções puras, sem banco, API ou tela. Persistência, vigência da capacidade, recálculo e
publicação pertencem às partes [16](../plano/16-calculo-recalculo-e-rastreabilidade.md) e
[18](../plano/18-consulta-dashboards-e-boletins.md).

## Convenções comuns

- **Versão:** `INDICADORES_VERSAO_FORMULA = 1` em todas as fichas. Mudar o significado de
  um cálculo exige nova versão; a anterior continua disponível para reproduzir resultados.
- **Células de origem:** referem-se ao Consolidado 2026. A Expectativa 2026 usa as mesmas
  posições nas abas `MH` e `TABULAÇÃO`; as diferenças estão em
  [Expectativa](#expectativa-2026). A aba `ACUMULADO` (e `ACUMULADO MENSAL`) só referencia
  células da `TABULAÇÃO` (`C5:C234`) e guarda colunas históricas digitadas: não tem
  fórmula própria e não origina indicador.
- **Decimais:** entradas decimais são textos (`"57.5"`); números JS são recusados.
  O cálculo usa frações exatas e não arredonda valores intermediários.
- **Arredondamento:** só na saída, com 12 casas decimais, meio para cima, sem zeros finais
  (`INDICADORES_ESCALA_SAIDA`). A planilha não arredonda; casas e método de apresentação
  (por exemplo, turistas inteiros) continuam pendentes.
- **Percentuais:** escala 0–100 na entrada e na saída. A planilha guarda frações 0–1.
- **Indisponibilidade:** dado, parâmetro ou base ausente resulta em
  `{ estado: 'indisponivel', motivo, detalhe }`, nunca em zero. Motivos:
  `sem_respondentes`, `capacidade_zero`, `base_zero`, `dado_ausente`, `parametro_ausente`
  e `entrada_invalida`. Um indicador que depende de outro herda a causa raiz.
  Zero só é publicado quando é o resultado real de dados informados.
- **Entrada inválida** (percentual acima de 100, número em vez de texto, dias menor que 1,
  identificador repetido, faixas sobrepostas) bloqueia todo o cálculo e devolve erros por campo.
- **População e respondentes:** `meios` é a população elegível do período com a capacidade
  vigente, escolhida por quem chama. Respondente é o meio com `taxaOcupacao` informada.
  Capacidade ausente em qualquer meio da soma torna o total indisponível.

## Parâmetros registrados como hipótese

Os valores não existem no código: chegam na entrada da função. As chaves estão em
`PARAMETROS_INDICADORES`; os valores lidos na planilha estão na
[massa de referência](../../fixtures/oto/indicadores-referencia.json), todos com situação
`hipotese_pendente_homologacao` e sem vigência definida.

| Chave                        | Valor na planilha                                            | Origem                         | O que falta confirmar                                                                          |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `day_use.percentual`         | 15,15                                                        | `TABULAÇÃO!B97` (nota) e `J97` | Valor, definição, origem e vigência. A Pesquisa de Demanda 2024 não está no conjunto recebido. |
| `day_use.fator_hospedados`   | 1                                                            | `TABULAÇÃO!L102`               | Significado da célula, que não tem rótulo.                                                     |
| `leitos_media.minimo_por_uh` | 1                                                            | `MH!H2:H85`, `MH!H88`          | Se o mínimo é sempre uma pessoa por UH, inclusive em RHC.                                      |
| `faixas_ocupacao.limites`    | 81–100, 61–80,99, 41–60,99, 21–40,99 e até 20,99 (inclusive) | `TABULAÇÃO!O5:R9`              | Limites, lacunas entre faixas e o rótulo "abaixo de 20%" com critério "até 20,99%".            |

`J97` contém `0,8485` digitado, isto é, `1 − 0,1515`. O código recebe o percentual (15,15)
e calcula o complemento.

## Fichas

### `leitos_media` — leitos ajustados pela média mínimo × máximo

| Campo          | Definição                                                                                |
| -------------- | ---------------------------------------------------------------------------------------- |
| Unidade        | leitos                                                                                   |
| Entradas       | UH do meio; máximo de leitos por UH (`MH!G`, `InventarioVersao.maxLeitosPorUh`)          |
| Fórmula        | `UH × (mínimo + máximo) ÷ 2`                                                             |
| Agregação      | Por meio de hospedagem; totais por soma (`MH!K86`). RHC: mesma fórmula sobre as unidades |
| Arredondamento | Nenhum (convenção comum)                                                                 |
| Parâmetros     | `leitos_media.minimo_por_uh`                                                             |
| Origem         | `MH!J2:J85 = (H+I)/2`, `MH!K2:K85 = D×J`, `MH!K88` (RHC), `TABULAÇÃO!J5:J44`             |
| Função         | `calcularLeitosMedia`                                                                    |

Divergência: várias células de `MH!K` foram digitadas com arredondamento para cima
(`K12 = 28` para 27,5; `K19 = 53` para 52,5; `K22 = 48` para 47,5), enquanto outras mantêm
a fórmula com meio leito (`K38 = 57,5`; `K39 = 10,5`). O código não arredonda. O máximo por
UH (`MH!G`) é digitado e nem sempre acompanha leitos ÷ UH (linhas 14, 38 e 39).

### `taxa_ocupacao_uh` — taxa de ocupação ponderada por UH

| Campo          | Definição                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| Unidade        | percentual 0–100                                                          |
| Entradas       | Taxa de ocupação informada e UH vigentes de cada respondente              |
| Fórmula        | `Σ(taxa × UH) ÷ Σ(UH)` dos respondentes                                   |
| Agregação      | Média ponderada pelo peso `UH ÷ total de UH respondentes` (`TABULAÇÃO!H`) |
| Arredondamento | Convenção comum                                                           |
| Parâmetros     | Nenhum                                                                    |
| Origem         | `TABULAÇÃO!J48 = SUMPRODUCT(L5:L44; H5:H44) / H45`; `H = G / G45`         |
| Função         | `calcularTabulacaoOcupacao` → `indicadores.taxa_ocupacao_uh`              |

Indisponível sem respondentes, com UH ausente em algum respondente ou com soma de UH zero.
Divergências: na planilha, uma linha com nome e sem taxa entra como 0% com peso; no código,
quem não tem taxa não é respondente. A planilha busca a capacidade pelo nome fantasia e
troca falha de busca por zero (`IFERROR(...;"0")`); no código, capacidade ausente torna o
indicador indisponível. As histórias 1.6 e 3.4 do levantamento falam em ponderação por
leitos; a planilha pondera por UH — conflito a resolver com o OTO.

### `taxa_ocupacao_tipo` — ocupação por tipo de hospedagem

| Campo          | Definição                                                                         |
| -------------- | --------------------------------------------------------------------------------- |
| Unidade        | percentual 0–100                                                                  |
| Entradas       | Taxa e UH dos respondentes do tipo                                                |
| Fórmula        | `Σ(taxa × UH) ÷ Σ(UH)` dos respondentes do tipo                                   |
| Agregação      | Média ponderada por UH dentro do tipo                                             |
| Arredondamento | Convenção comum                                                                   |
| Parâmetros     | Nenhum                                                                            |
| Origem         | `MH!I145` (hotel), `MH!O145` (resort), `MH!I182` (pousada); `TABULAÇÃO!D107:D109` |
| Função         | `calcularTabulacaoOcupacao` → `ocupacaoPorTipo`                                   |

O código calcula para todo tipo presente na população. Divergências: a planilha só tem
tabelas de hotel, resort e pousada, embora `MH!L` também traga hotel fazenda, flat e
hostel; no Consolidado, tipo sem respondente vira o texto `"0"` (`IFERROR`), e na
Expectativa vira `#DIV/0!` — no código fica indisponível. A coluna `MH!M` (PESO) divide por
totais de tipos trocados em algumas linhas (`M19`, `M26`, `M32`) e não é usada pelas
fórmulas inspecionadas; não foi implementada.

### `faixa_ocupacao_meios` e `faixa_ocupacao_leitos` — faixas de ocupação

| Campo          | Definição                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| Unidade        | quantidade e percentual 0–100 por faixa                                                    |
| Entradas       | Taxa e leitos reais de cada respondente                                                    |
| Fórmula        | Meios (ou leitos) da faixa ÷ meios (ou leitos) classificados em alguma faixa               |
| Agregação      | Contagem e soma por faixa; limites inclusivos                                              |
| Arredondamento | Convenção comum                                                                            |
| Parâmetros     | `faixas_ocupacao.limites`                                                                  |
| Origem         | `TABULAÇÃO!R5:R10` e `T5:T10` (meios); `S5:S10` e `U5:U10` (leitos); `ACUMULADO!C184:C189` |
| Função         | `calcularTabulacaoOcupacao` → `faixasOcupacao`                                             |

Taxa fora de todas as faixas (por exemplo, 80,995) não é descartada em silêncio: aparece
em `meiosSemFaixa`. Divergência: a planilha usa critérios diferentes para leitos
(`S5 = SUMIF(≥81%)` sem teto; `S6 = SUMIF(≥61%) − S5`; `S7` e `S8` por diferenças de
`≤60,99%` e `≤40,99%`), o que coloca valores entre 80,99 e 81 na faixa "ótima" para leitos
e em nenhuma para meios. O código classifica cada respondente uma vez e usa a mesma
classificação para meios e leitos.

### `cobertura_meios`, `cobertura_uhs`, `cobertura_leitos` e `cobertura_leitos_media`

| Campo          | Definição                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidade        | percentual 0–100                                                                                                                                                    |
| Entradas       | Capacidade de todos os meios da população, respondentes e RHC agregado                                                                                              |
| Fórmula        | Meios: `respondentes ÷ meios`. UH: `UH resp. ÷ UH`. Leitos: `leitos resp. ÷ (leitos MH + leitos RHC)`. Leitos média: `leitos média resp. ÷ (leitos média MH + RHC)` |
| Agregação      | Razão de somas                                                                                                                                                      |
| Arredondamento | Convenção comum                                                                                                                                                     |
| Parâmetros     | Nenhum (leitos média depende de `leitos_media.minimo_por_uh`)                                                                                                       |
| Origem         | `TABULAÇÃO!K75` (`G55`), `K76`, `K77` (`G56`), `K81` (`G57`); bases em `J62:J67` e `J70:J72`                                                                        |
| Função         | `calcularTabulacaoOcupacao` → `indicadores.cobertura_*`                                                                                                             |

Sem respondentes a cobertura é `0` de fato. Fica indisponível com capacidade ausente, RHC
ausente (nas duas de leitos) ou base zero. A confirmar: os denominadores de leitos incluem
RHC, embora RHC não responda à pesquisa; os de meios e UH não incluem.

### `leitos_media_nao_respondentes`

| Campo          | Definição                                           |
| -------------- | --------------------------------------------------- |
| Unidade        | leitos                                              |
| Entradas       | Leitos média de toda a população e dos respondentes |
| Fórmula        | `leitos média MH − leitos média respondentes`       |
| Agregação      | Diferença de somas                                  |
| Arredondamento | Convenção comum                                     |
| Parâmetros     | `leitos_media.minimo_por_uh` (indireto)             |
| Origem         | `TABULAÇÃO!J82 = J70 − J81`                         |
| Função         | `calcularTabulacaoOcupacao` → `indicadores`         |

### `turistas_mh_respondentes`, `turistas_mh_nao_respondentes`, `turistas_mh` e `turistas_mh_dia`

| Campo          | Definição                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidade        | turistas no período; turistas por dia                                                                                                               |
| Entradas       | Leitos média e taxa de cada respondente; leitos média dos não respondentes; diárias do período                                                      |
| Fórmula        | Respondentes: `Σ(leitos média × taxa) × dias`. Não respondentes: `leitos média não resp. × taxa geral × dias`. Total: soma. Por dia: `total ÷ dias` |
| Agregação      | Soma por respondente; não respondentes estimados pela taxa geral ponderada por UH                                                                   |
| Arredondamento | Convenção comum (a planilha não arredonda para inteiro)                                                                                             |
| Parâmetros     | `leitos_media.minimo_por_uh` (indireto)                                                                                                             |
| Origem         | `TABULAÇÃO!M5:M44 = (J×L)×G59`, `J85 = M45`, `J86 = (J82×J48)×G59`, `J87` (`J49`), `J88`; dias em `G59`                                             |
| Função         | `calcularTabulacaoOcupacao` → `indicadores.turistas_mh*`                                                                                            |

A confirmar: a fórmula multiplica leitos ocupados por dias, sem permanência média ou giro;
o resultado se parece mais com pernoites do que com visitantes únicos. A taxa aplicada aos
não respondentes é a geral, não a do tipo. `diasPeriodo` é entrada (inteiro ≥ 1): a
duração inclusiva do período vem da parte 10.

### `turistas_rhc` e `turistas_rhc_dia`

| Campo          | Definição                                                      |
| -------------- | -------------------------------------------------------------- |
| Unidade        | turistas no período; turistas por dia                          |
| Entradas       | Leitos média do RHC agregado; taxa geral dos MH; dias          |
| Fórmula        | `leitos média RHC × taxa geral × dias`; por dia: `÷ dias`      |
| Agregação      | RHC agregado por período, sem cadastro das casas               |
| Arredondamento | Convenção comum                                                |
| Parâmetros     | `leitos_media.minimo_por_uh` (indireto)                        |
| Origem         | `TABULAÇÃO!J91 = (J71×J48)×G59` (`J50`), `J92`; `J71 = MH!K88` |
| Função         | `calcularTabulacaoOcupacao` → `indicadores.turistas_rhc*`      |

A confirmar: a planilha aplica às RHC a taxa de ocupação dos meios regulares. Sem RHC
informado o indicador fica indisponível, e com ele os totais que o somam.

### `turistas_hospedados`, `turistas_day_use`, `turistas_total` e os valores por dia

| Campo          | Definição                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidade        | turistas no período; turistas por dia                                                                                                                                                        |
| Entradas       | Turistas em MH e em RHC; dias                                                                                                                                                                |
| Fórmula        | Hospedados: `MH + RHC`. Total por dia: `hospedados por dia × fator ÷ (1 − day use)`. Day use por dia: `total por dia − hospedados por dia`. Day use: `× dias`. Total: `hospedados + day use` |
| Agregação      | Soma e ajuste proporcional                                                                                                                                                                   |
| Arredondamento | Convenção comum                                                                                                                                                                              |
| Parâmetros     | `day_use.percentual`, `day_use.fator_hospedados`                                                                                                                                             |
| Origem         | `TABULAÇÃO!J100`, `J102`, `J103 = (J102×L102)/J97`, `J96 = J103 − J102`, `J95 = J96×G59` (`J51`), `J101` (`J52`), `J53`                                                                      |
| Função         | `calcularTabulacaoOcupacao` → `indicadores.turistas_*`                                                                                                                                       |

Pela fórmula, o percentual de day use é a participação no total diário (hospedados + day
use); com 15,15, o day use equivale a cerca de 17,86% dos hospedados. `J52/J53` do boletim
são iguais a `J101/J103`. Day use de 100% zera a base (`base_zero`); parâmetro ausente
deixa day use e total indisponíveis, sem afetar os hospedados; fator que resulte em day
use negativo é recusado.

### `diaria_media_aritmetica` e `diaria_media_ponderada`

| Campo          | Definição                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidade        | reais por diária (preço ofertado, não faturamento)                                                                                                                                                                                                |
| Entradas       | Preços observados por empreendimento no período; leitos de cada empreendimento                                                                                                                                                                    |
| Fórmula        | Por empreendimento: média dos preços observados. Aritmética: média dessas médias. Ponderada: `Σ(média × leitos) ÷ Σ(leitos)`                                                                                                                      |
| Agregação      | Por recorte (a planilha separa hotel, resort e pousada)                                                                                                                                                                                           |
| Arredondamento | Convenção comum                                                                                                                                                                                                                                   |
| Parâmetros     | Nenhum                                                                                                                                                                                                                                            |
| Origem         | Diária: abas mensais `AI = AVERAGE(D:AH)`; `EVOLUÇÃO MENSAL - 2026!E22` (aritmética), `E23 = SUMPRODUCT(E8:E20; D8:D20) / D21` com `D = leitos ÷ total` (ponderada). Na tabulação os valores são digitados em `TABULAÇÃO!C114:C116` e `C121:C123` |
| Função         | `calcularDiariaMedia`                                                                                                                                                                                                                             |

Divergência: na planilha, o empreendimento sem preço entra com zero no numerador da
ponderada e mantém o peso no denominador, o que reduz a média. O código o exclui das duas
médias e do peso. Não implementado: média geral entre categorias (`EVOLUÇÃO MENSAL!E67`,
Expectativa `TABULAÇÃO!D128:D129`). Protocolo de coleta, fontes, semana/fim de semana e
outliers seguem pendentes (parte 17).

### `revpar`

| Campo          | Definição                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Unidade        | reais por UH disponível por dia                                                                   |
| Entradas       | Diária média e taxa de ocupação do mesmo recorte                                                  |
| Fórmula        | `diária média × taxa ÷ 100`                                                                       |
| Agregação      | Por tipo e por método da diária (aritmética ou ponderada)                                         |
| Arredondamento | Convenção comum                                                                                   |
| Parâmetros     | Nenhum                                                                                            |
| Origem         | `TABULAÇÃO!D114:D116` e `D121:D123` (`= C × D107:D109`); Expectativa `E128:E129` (geral, `× J48`) |
| Função         | `calcularRevpar`                                                                                  |

A planilha usa preço ofertado; não é receita realizada. Não implementada a receita
estimada (`TABULAÇÃO!F114:F117`, `F121:F124`, Expectativa `G128:G129`), que multiplica o
RevPAR pelo total de UH do tipo no inventário e pelos dias.

## Expectativa 2026

A Expectativa usa as mesmas fórmulas e posições; o código é o mesmo e o resultado continua
sendo agregação de intenções declaradas, não previsão estatística. Diferenças encontradas:

- `TABULAÇÃO!G59 = 3` (Páscoa) e título próprio; `I5:I44` busca em intervalo maior, com o
  mesmo resultado.
- `MH!I145`, `O145` e `I182` sem `IFERROR`: tipo sem respondente aparece como `#DIV/0!`.
- Linhas `TABULAÇÃO!B126:G129` de diária geral e a aba `CÁLCULO DA RECEITA ESTIMADA`,
  com vínculo externo (`[2]RESULTADOS!E683`) e gastos médios digitados. Fora desta parte.

A comparação entre Expectativa e Consolidado deve usar a mesma população e versão de
fórmula; a regra de comparação não foi definida.

## Pendências de homologação

1. Valor, definição, origem e vigência do day use; significado de `TABULAÇÃO!L102`.
2. Peso da ocupação: UH (planilha) ou leitos (levantamento S2).
3. Tratamento de linha sem resposta, hoje contada como 0% na planilha.
4. Arredondamento dos leitos média e regra do máximo por UH; mínimo fixo em 1.
5. Limites e lacunas das faixas; critério distinto para leitos.
6. Inclusão de RHC nos denominadores de cobertura de leitos.
7. Significado de "turistas" (pernoites ou visitantes), taxa geral para não respondentes
   e para RHC.
8. Tipos sem tabela na planilha (hotel fazenda, flat, hostel) e coluna `MH!M`.
9. Diária: empreendimento sem preço na ponderada, média geral e protocolo de coleta.
10. Casas e método de arredondamento na apresentação; tolerância de comparação.
11. Resultados de referência aprovados pelo OTO: a massa atual foi calculada pela equipe.

Não implementado nesta parte, por falta de fórmula nas abas inspecionadas ou de definição:
variação entre períodos, sazonalidade, receita estimada, diária geral, capacidade
disponível versus cadastrada e efeito de troca de capacidade no meio do período.

## Evidência reproduzível

[`indicadores-referencia.json`](../../fixtures/oto/indicadores-referencia.json) traz
populações fictícias, os parâmetros-hipótese e os resultados esperados, calculados à mão a
partir das fórmulas acima. Os
[testes](../../common/test/indicadores/indicadores.test.mjs) rodam em ESM e CommonJS e
cobrem amostra parcial, nenhum respondente, capacidade zero, base zero, período de um dia,
amostra completa sem RHC, parâmetro ausente, resposta zero, entrada inválida e precisão
decimal. Um teste verifica que os valores dos parâmetros não aparecem no código-fonte.
