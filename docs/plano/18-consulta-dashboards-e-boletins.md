# 18 — Consulta, dashboards, comparações e boletins

**Situação:** planejado; não implementado por este documento.

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
