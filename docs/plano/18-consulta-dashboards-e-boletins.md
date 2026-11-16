# 18 — Consulta, dashboards, comparações e boletins

**Situação:** em andamento — 1º incremento técnico entregue (painel com dados fictícios);
sem homologação do OTO.

**Rastreabilidade:** RF09, RF15–RF18, RF34 e RF38; RNF01, RNF03, RNF04 e RNF08.

**Dependências:** [03](03-perfis-permissoes-e-visibilidade.md), [16](16-calculo-recalculo-e-rastreabilidade.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).

Selecionar somente indicadores hoteleiros. Distinguir diária de ticket médio, média de pernoites de total de pernoites e fluxo hoteleiro de veículos/fretamento. As demais abas do BI não ampliam o escopo.

## Objetivo

Entregar a camada de consumo aprovada pelo OTO com números rastreáveis e público definido.
A parte 14 é necessária quando houver distribuição de boletins; a 17 libera métricas adicionais.

## Definições antes de construir

Validar telas/relatórios com operadores e visualizadores, audiência de cada indicador,
necessidade de consulta pública, formato dos boletins e papel do Looker Studio. O Plano v4
indica Looker Studio na proposta tecnológica; decidir sua integração com a aplicação em vez
de construir dois dashboards independentes com regras divergentes.

## API, BI e dados

- Expor resultados liberados com filtros por período, tipo de coleta, segmento/categoria,
  recorte e método, sempre informando unidade, atualização, cobertura e revisão utilizada.
- Comparar períodos compatíveis; distinguir expectativa, consolidado e previsão experimental.
- Criar camada de consumo estável (API/views/dataset conforme integração aprovada), sem
  recalcular fórmulas de negócio de forma divergente no frontend ou no Looker.
- Definir credenciais/acesso do BI e atualização dos dados. Não presumir que permissões
  da aplicação protegem automaticamente um relatório incorporado ou um link compartilhado.
- Gerar boletim a partir de uma revisão fechada/liberada, com período e origem identificáveis.
  Definir formato de exportação aprovado; não enviar dados de detalhe além do público permitido.

## Frontend

Painel de indicadores com gráficos e tabela acessível equivalente, filtros, comparações,
estados de carregamento, falha, sem dados e cálculo pendente. Exibir amostra/cobertura para
não apresentar um resultado parcial como total do município. Incluir caminho de consulta
à metodologia/linhagem conforme permissão e preparação/consulta de boletins.

## Critérios de aceite e testes

- Tela, exportação, boletim e BI mostram o mesmo resultado/revisão e a mesma unidade.
- Perfil restrito não acessa indicador ou dado pessoal por filtros, download ou URL do BI.
- Zero, sem resposta, cálculo pendente e dado indisponível são visualmente distintos.
- Gráficos têm alternativa legível por teclado/leitor de tela e funcionam em telas pequenas.
- Metas de desempenho e volume de teste são acordadas com OTO antes do aceite, não presumidas.

## Infraestrutura antecipada

`GET /indicadores` e `/indicadores/exportacoes` aceitam o subconjunto OData comum; o filtro do
cliente permanece dentro da visibilidade do perfil também na exportação. Essa infraestrutura
não homologa fórmulas, público, cobertura, dashboards, boletins ou integração com Looker.

## Atualização visual

A interface existente recebeu o [tema OTO e a navegação responsiva](interface-visual.md),
preservando os contratos e limites desta parte. Evidências e pendências estão no registro
da entrega visual; esta atualização não representa homologação de negócio.

## Incremento 1 — painel de indicadores com série fictícia

Entregue como conclusão técnica com dados fictícios; não é aceite nem homologação do OTO.

- **Contrato e API.** `IndicadorConsulta` e `ESQUEMA_INDICADORES` ganharam, sem remover campos,
  `periodoId`, `periodoTipo` (`mes`/`feriado_prolongado`, de `TIPOS_PERIODO` no common) e
  `periodoInicio`/`periodoFim` (`YYYY-MM-DD`), filtráveis e ordenáveis via OData em
  `GET /indicadores` e `/indicadores/exportacoes`. Contrato em
  [acesso.md](../contratos/acesso.md).
- **Massa fictícia.** [indicadores-demo.json](../../fixtures/oto/indicadores-demo.json), carregada
  por `pnpm db:indicadores-demo` com as proteções do seed, marcador próprio e liberação para
  gestor e visualizador ([instruções](../../fixtures/oto/README.md)).
- **Tela `/indicadores`**, seguindo o "Painel de indicadores" do protótipo v5 e o tema OTO:
  destaques do período de referência, tendência (Consolidado sólido, Expectativa tracejada),
  Expectativa × Consolidado por recorte no mesmo período e valores por recorte (shadcn chart
  com Recharts). Filtros com TanStack Form: indicador, tipo de coleta, recorte, método, tipo de
  período, intervalo de datas e período de referência. Unidade e rótulo do período ficam sempre
  visíveis, com aviso fixo de dado fictício e não homologado. A grade OData continua como tabela
  acessível, agora com tipo, início e fim do período; a exportação é o CSV genérico das
  coleções ([contrato](../contratos/exportacoes.md)), com os campos de período e o botão
  "Exportar CSV" da grade condicionado a consultar e exportar. Há estados de carregamento, erro com
  repetição, vazio e perfil sem permissão.
- **Sem recálculo.** O frontend só seleciona e formata os valores recebidos (texto decimal, sem
  ponto flutuante na exibição); não calcula diferenças, médias nem totais.

Evidências: testes do common (contrato e esquema); unitários e de integração do backend
(campos, filtros e ordenação por período; carga, repetição no-op, marcador incompatível e
período equivalente); Vitest do painel (carregamento, erro, vazio, sucesso, filtros e perfil
sem permissão) e das funções de seleção e formatação.

Limitações conhecidas:

- O intervalo seleciona períodos **inteiramente** contidos nele (`periodoInicio ge` e
  `periodoFim le`); períodos que cruzam as bordas ficam de fora.
- O painel lê até 10 páginas de 100 linhas por consulta e avisa quando trunca. Não há endpoint
  agregado nem de opções: indicadores, métodos e períodos vêm das linhas recebidas.
- `indicador_resultado` não tem chave única. Havendo mais de um resultado para a mesma
  combinação, o painel não escolhe nenhum, não plota e remete à tabela.
- Revisão publicada, cobertura/amostra, data de atualização e "cálculo pendente" dependem da
  parte 16 e ainda não aparecem.
- Comparação entre períodos compatíveis (ex.: mesmo mês do ano anterior), boletins, Looker
  Studio e metodologia/linhagem na tela ficam fora deste incremento.

Próximo passo: com a parte 16 (cálculo persistido e revisões), expor revisão, cobertura e
situação do cálculo na API e no painel; depois definir com o OTO público, comparações e
formato dos boletins.
