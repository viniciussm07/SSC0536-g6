# 15 — Metodologia, fórmulas e dados de referência dos indicadores

**Situação:** fórmulas v1 transcritas das planilhas e implementadas como funções puras, com
massa fictícia e testes; homologação do OTO pendente para todas as fichas e parâmetros.

**Rastreabilidade:** RF10–RF16 e RF35; seção 3.5 e seção 9.4.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md), [01](01-contrato-de-dados-e-regras.md), [10](10-periodos-e-calendario.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

A nota de TABULAÇÃO!B97 no Consolidado atribui o ajuste de day use à Pesquisa de Demanda 2024, não fornecida no conjunto. Solicitar definição e vigência desse parâmetro, sem exigir registros pessoais. Validar as fórmulas com massa fictícia e saídas esperadas aprovadas pelo OTO.

## Objetivo

Formalizar as definições de cada indicador antes de automatizar o cálculo.
Esta especificação pode avançar em paralelo aos fluxos, após liberação dos pré-requisitos.

## Ficha obrigatória por indicador

Registrar código, nome, unidade, versão da fórmula, entradas, fontes/colunas, período,
população elegível, respondentes usados, recorte, vigência da capacidade, método de
agregação, parâmetros, arredondamento e exemplo com resultado oficial validado pelo OTO.

## Regras a validar

- Ocupação: unidade de resposta (UH/leitos), média aritmética ou ponderada, peso correto,
  denominador, não respondentes e diferença entre população total e amostra respondente.
- Expectativa: agregação das respostas de intenção para período futuro; não é previsão
  estatística. Comparação com Consolidado deve preservar a população/metodologia usada.
- Capacidade: definição de disponível versus cadastrada e efeito de encerramento,
  entrada de estabelecimentos e alterações no meio do período.
- Fluxo/pernoites: duração inclusiva, ocupação, leitos, day use, RHC e demais fatores
  efetivamente utilizados pelo OTO; não inventar um multiplicador genérico.
- Diária: fontes selecionadas, pesos, data da coleta versus estadia, recortes de semana
  e fim de semana e tratamento de outliers/ausências; escopo condicionado à fonte aprovada.
- Variação: períodos comparáveis, diferença absoluta/percentual, base zero e dados ausentes.
- Sazonalidade: frequência, série disponível, mudanças metodológicas e comparabilidade.

## Dados e testes previstos

- Vincular a metodologia a `IndicadorDefinicao`, `ParametroCalculo` e recortes aprovados.
  Planejar versões imutáveis de fórmula/parâmetros: alterar uma linha usada em resultado
  antigo não pode eliminar sua reprodutibilidade.
- Construir massa fictícia de referência com o layout recebido e entradas/saídas esperadas
  homologadas pelo OTO. Não exigir dados pessoais de um período real fechado.
- Registrar tolerância de comparação aprovada, sem presumir equivalência com qualquer média.
- Preparar casos de limite: nenhum respondente, capacidade zero, base zero, mês bissexto,
  troca de capacidade e amostra parcial.

## Critérios de aceite

Cada indicador liberado possui ficha aprovada e casos reproduzíveis. Indicador sem fonte,
fórmula ou resultado de referência continua bloqueado. A ausência de dados deve aparecer
como indisponibilidade ou estimativa explicitada, nunca como valor zero fabricado.

## Implementação e continuidade

Entregues as [fichas da fórmula v1](../contratos/indicadores.md), o domínio `indicadores`
de [`@ssc0536/common`](../../common/README.md) e a
[massa de referência](../../fixtures/oto/indicadores-referencia.json). As fórmulas foram
lidas nas abas `MH`, `TABULAÇÃO` e `ACUMULADO` do Consolidado 2026, nas abas equivalentes
da Expectativa 2026 e nas abas mensais e de evolução da diária média, em leitura; os
originais e seus hashes foram preservados.

- Cobertos: taxa de ocupação ponderada por UH, faixas de ocupação, cobertura de
  respondentes, turistas em MH (respondentes e não respondentes pela média mínimo × máximo),
  RHC, day use, total e por dia, ocupação por tipo, diária média aritmética e ponderada e RevPAR.
- Cálculo com frações exatas, decimais em texto e arredondamento apenas na saída (12 casas).
  Dado, parâmetro ou base ausente resulta em indisponibilidade com motivo, nunca em zero.
- O percentual de day use, o fator de `TABULAÇÃO!L102`, o mínimo de leitos por UH e os
  limites das faixas são parâmetros de entrada registrados como hipótese pendente de
  homologação; um teste impede que seus valores apareçam no código.
- Casos de limite testados: nenhum respondente, capacidade zero, base zero, período de um
  dia, amostra parcial e completa, RHC e parâmetros ausentes, resposta zero e entrada inválida.

Sem alteração de schema, API ou tela. Não foram implementados variação, sazonalidade,
receita estimada, diária geral nem as regras de capacidade disponível e de troca de
capacidade no período: faltam fórmula nas abas inspecionadas ou definição do OTO.
Mês bissexto não muda o cálculo, porque a quantidade de diárias é entrada (parte 10).

### Pendências que seguem bloqueando o aceite

As onze pendências estão detalhadas nas
[fichas](../contratos/indicadores.md#pendências-de-homologação). Hipóteses implementadas
que dependem de confirmação do OTO:

- **Day use 15,15%:** nota de `TABULAÇÃO!B97` atribuída à Pesquisa de Demanda 2024, não
  fornecida. É parâmetro de entrada, sem vigência; o valor só existe na massa fictícia.
  Pela fórmula (`J103 = J102 × L102 ÷ 0,8485`) é a participação no total diário, não um
  acréscimo sobre os hospedados. O fator `L102 = 1` também é parâmetro sem significado definido.
- **Não respondentes:** quem não tem taxa não é respondente e tem os leitos média estimados
  pela taxa geral ponderada por UH (`J86`). A planilha conta linha sem taxa como 0% com
  peso, e a mesma taxa geral é aplicada às RHC (`J91`).
- **Cobertura de leitos com RHC no denominador:** `K77` e `K81` dividem os leitos dos
  respondentes por leitos MH + RHC, embora RHC não responda; meios e UH não incluem RHC.
  Mantido como na planilha; sem RHC informado, a cobertura de leitos fica indisponível.
- **Arredondamento de turistas:** a planilha não arredonda e o código também não (saída
  com até 12 casas, por exemplo 262,5 turistas). Casas, método e se turistas são
  apresentados inteiros dependem da parte 18 e do OTO.
- **Peso da ocupação:** UH na planilha; leitos no levantamento S2 (histórias 1.6 e 3.4).
- **Leitos média:** mínimo fixo de 1 por UH e células de `MH!K` digitadas arredondadas
  para cima; o código não arredonda.
- **Referências:** os resultados esperados foram calculados pela equipe, não aprovados pelo OTO.

Nenhum indicador está liberado pelo critério de aceite desta parte.

### Próximo passo

Parte [16](16-calculo-recalculo-e-rastreabilidade.md): escolher população e capacidade
vigente, ler `ParametroCalculo` com vigência, chamar estas funções e persistir resultado,
versão de fórmula e rastreabilidade. `IndicadorResultado.valor` hoje não aceita nulo:
a representação de resultado indisponível precisa ser decidida nessa parte.

### Verificações locais

Executadas em 15/11/2026, em Windows, sem commit:

- `pnpm lint`, `pnpm typecheck` e `pnpm build`: aprovados.
- `pnpm test:unit`: 212 testes no common (55 novos de indicadores, em ESM e CommonJS),
  39 no backend e 116 no frontend, todos aprovados.
- `pnpm format:check`: falha no checkout Windows por fim de linha CRLF
  (`core.autocrlf=true` na configuração do Git do sistema), inclusive em arquivos não tocados. Os arquivos desta parte
  passam no Prettier, e o repositório inteiro passa com `--end-of-line auto`.
- `pnpm validate:repo`: falha no mesmo checkout porque o link simbólico `.agents/skills`
  vira arquivo de texto. Com o caminho apontado para `.claude/skills`, links locais e
  hashes das sete planilhas passam; a checagem do frontmatter da skill esbarra no CRLF.
- Integração com banco não executada: não há mudança de schema ou persistência.
  Nenhum resultado de CI ou homologação do OTO é declarado.
