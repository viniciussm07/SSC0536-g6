# Painel de indicadores — parte 18

Camada de consumo dos resultados publicados, definida em [parte 18](../plano/18-consulta-dashboards-e-boletins.md).
Os valores são **demonstrativos**: fórmulas e parâmetros continuam sem homologação do OTO
([parte 15](indicadores.md), [parte 16](calculos.md)).

Contratos portáveis em `@ssc0536/common`, domínio `painel`. O painel **não recalcula** fórmulas:
lê `IndicadorResultado` já publicado (execução `publicado`) ou de carga histórica. A única conta é
a variação entre períodos, em decimal exato no servidor.

## Permissões e visibilidade

`GET /api/indicadores/painel` e `/opcoes` exigem `indicadores` `consultar` (escopo `todos`). A
visibilidade por perfil (`VisibilidadeIndicadorPerfil`) vem da mesma função
(`escopoIndicadoresConsumo`) usada pela grade `GET /api/indicadores` e pela exportação
`/indicadores/exportacoes`: nenhum filtro, comparação ou URL do painel amplia o que o perfil vê.
Não há dados pessoais nem de detalhe por meio de hospedagem na resposta.

## `GET /api/indicadores/painel`

Query (todos os outros parâmetros são recusados com 400):

| Parâmetro             | Obrigatório | Descrição                                                          |
| --------------------- | ----------- | ------------------------------------------------------------------ |
| `periodoId`           | sim         | Inteiro positivo.                                                  |
| `tipoColeta`          | sim         | `expectativa` ou `consolidado`; os dois nunca se misturam.         |
| `comparacaoPeriodoId` | não         | Período base; diferente de `periodoId` e do mesmo tipo de período. |

Resposta `{ "data": Painel }`:

- `situacao`: `disponivel`; `calculo_pendente` (há cálculo concluído/em andamento sem publicação e
  nada publicado); `sem_dados`. Nos dois últimos `itens` é vazio: ausência nunca vira zero.
- `itens[]`: `indicadorId`, `codigo`, `nome`, `unidade`, `grupo` (`indicador` ou `cobertura`),
  `recorte`, `metodo`, `valor`, `fonte` e `comparacao`.
  - `valor`: `{ estado: "disponivel", valor: "66.5" }` (string decimal; `"0"` é zero real) ou
    `{ estado: "indisponivel", motivo, detalhe }`.
  - `fonte`: `origem` (`calculo` ou `carga`), `execucaoId`, `revisao`, `publicadaEm`,
    `calculadoEm` — identifica a revisão exibida em tela, boletim e exportação.
  - `comparacao`: `null` sem período base; `{ estado: "disponivel", valor, variacao, fonte }`
    (`variacao` = atual − base, na unidade do indicador; pontos percentuais nas taxas);
    `{ estado: "indisponivel" }` ou `{ estado: "ausente" }` (sem resultado no período base).
- `atualizadoEm`: maior `calculadoEm` dos itens. `aviso`: pendência de homologação.

Erros: 400 `ENTRADA_INVALIDA`; 400 `PERIODOS_INCOMPATIVEIS` (tipos de período diferentes, por
exemplo mês × feriado prolongado); 404 `PERIODO_NAO_ENCONTRADO`.
Indicadores de cobertura (`cobertura_*`) são marcados no `grupo` para que a interface mostre a
amostra e não apresente resultado parcial como total do município.

## `GET /api/indicadores/painel/opcoes`

`{ "data": OpcaoPainel[] }`: combinações `periodoId` + `tipoColeta` com resultado visível ao perfil,
da mais recente à mais antiga (`periodo`, `periodoTipo`).

## `GET /api/indicadores/painel/serie`

Query `tipoColeta` (obrigatório; outros parâmetros recusados). Devolve até 24 períodos mais recentes
(`periodos`, do mais antigo ao mais recente) e `series[]` com `pontos` (`periodoId`, `valor` em texto
ou `null` quando não há resultado publicado/indisponível; nunca zero). Alimenta os gráficos de
tendência, com a mesma visibilidade do painel.

## `GET /api/indicadores/painel/exportacao`

Mesmos parâmetros do painel mais `formato=pdf|xlsx`. Exige `indicadores` `exportar` (403 sem ela).
Devolve o arquivo (`application/pdf` ou planilha OOXML) com período, coleta, comparação, atualização,
aviso de metodologia e, por indicador: valor (XLSX com número exato), unidade, base e variação quando
há comparação, origem/revisão e data de cálculo. Indisponível e "sem base" aparecem como texto.

## Interface

Seção **Painel de indicadores** na visão geral (home sem empreendimento selecionado; perfis com `indicadores` `consultar`), período mais recente por padrão: filtros de período/coleta e
comparação; cartões-síntese, gráficos Chart.js nas cores do tema OTO (ocupação por tipo, evolução da taxa e
turistas por período; canvas com descrição) e **tabelas equivalentes** sempre presentes; estados de carregamento, falha com nova tentativa, `sem_dados`,
`calculo_pendente`, zero e indisponível (com motivo) visualmente distintos; identificação da
revisão e da atualização; nota de amostra pela cobertura de meios. "Exportar" (permissão
`indicadores` `exportar`) baixa a seleção atual em PDF ou XLSX, gerada no servidor a partir da mesma
resposta da API.

## `GET /api/indicadores/painel/participacao`

Query `tipoColeta`. Exige `pesquisas` `consultar` (administrador, gestor e estagiário; 403 para os
demais). `edicoes[]` com `pesquisaId`, `periodoId`, `periodo`, `dataInicio`, `destinatarios` (meios
convidados, público congelado na abertura) e `respondentes` (meios distintos com resposta). Só
contagens agregadas, sem nomes nem respostas; rascunhos ficam de fora. A série também devolve
`feriados[]` (feriados prolongados que se sobrepõem ao intervalo dos períodos).

## Faixas, participação e sazonalidade

- **Faixas de ocupação:** `faixa_ocupacao_meios` e `faixa_ocupacao_leitos` por recorte = código da
  faixa (`excelente`, `otima`, `boa`, `regular`, `ruim`), valor = percentual dos respondentes
  classificados. Barras empilhadas de meios e leitos. A lista de limites ainda é hipótese.
- **Participação da pesquisa:** convidados × respondentes por edição, com tabela equivalente.
- **Sazonalidade:** ocupação mensal com os meses que contêm feriado prolongado destacados, maior e
  menor mês e média com/sem feriado. Só cruza calendário e resultado; não atribui causa.

Como no caso de diária/RevPAR, as linhas de faixas vêm do seed de apresentação; o cálculo publicado
da parte 16 ainda não as grava.

## Diária média e RevPAR

O painel mostra `diaria_media_ponderada` e `revpar` (recorte total) como cartões e a diária por tipo e
a evolução de ambos em gráficos, sempre como **preço ofertado, não faturamento**. Valores em reais
(`reais_por_diaria`, `reais_por_uh_dia`). No ambiente de apresentação o seed calcula esses números
sobre as coletas simuladas; o fluxo de cálculo publicado da parte 16 ainda não os produz (a fórmula,
o protocolo de coleta e a liberação seguem na parte 17), então fora da apresentação eles só aparecem
se houver resultados gravados.

## Pendências (dependem do OTO)

- **Looker Studio**: decisão de integração, credenciais e atualização do BI não tomadas. Nenhuma
  conexão foi criada; qualquer conexão futura deve ler esta camada (ou view equivalente) e não
  reaplicar fórmulas.
- Formato aprovado do boletim (hoje, impressão do navegador/PDF), distribuição por e-mail
  (parte 14) e público da consulta externa; **não há consulta pública**.
- Exportação CSV (`/indicadores/exportacoes`) continua sem revisão/fonte: usar o painel para
  conferência de revisão até definir o formato oficial.
- Metas de desempenho e volume de teste; previsão experimental (parte 19) não aparece no painel.
- Caminho do painel para a linhagem/metodologia por perfil (detalhe de cálculo segue na tela
  Cálculos, restrita a administrador e gestor).
