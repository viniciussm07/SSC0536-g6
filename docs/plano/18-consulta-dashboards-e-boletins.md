# 18 — Consulta, dashboards, comparações e boletins

**Situação:** primeiro incremento implementado: painel de indicadores publicados com comparação
entre períodos, tabela acessível e exportação em PDF/XLSX. Looker Studio, boletim formal e consulta
pública seguem pendentes de decisão do OTO.

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

## Implementação (primeiro incremento)

Contrato em [docs/contratos/painel.md](../contratos/painel.md).

- **Camada de consumo:** `GET /api/indicadores/painel` e `/painel/opcoes` leem só resultados
  publicados (ou de carga), com unidade, revisão, origem e atualização; nada é recalculado fora do
  cálculo da parte 16. A visibilidade por perfil é a mesma função da grade e da exportação.
- **Comparação:** só entre períodos do mesmo tipo e da mesma coleta; variação em decimal exato;
  expectativa e consolidado nunca são misturados.
- **Estados:** `disponivel`, `calculo_pendente`, `sem_dados`; valor zero, indisponível (com motivo) e
  base ausente são distintos. Cobertura aparece em seção própria com aviso de amostra.
- **Interface:** seção **Painel de indicadores** na visão geral (home): barras decorativas + tabela equivalente, filtros por
  rótulo, estados de erro/carregamento/vazio gráficos Chart.js e exportação em PDF ou XLSX (permissão de exportar) com a identificação da revisão.

### Evidências

- `common/test/painel/`: validação da consulta e guardas de formato.
- `apps/backend/test/painel.test.ts`: fonte/revisão, zero × indisponível, carga, comparação decimal,
  períodos incompatíveis, cálculo pendente × sem dados e visibilidade compartilhada com a grade.
- `apps/backend/test/painel.integration.test.ts`: HTTP/PostgreSQL com perfis `gestor` e
  `visualizador`, mesmo valor no painel e na grade, entrada inválida e 404.
- `apps/frontend/src/components/painel-indicadores/painel-indicadores.test.tsx`: estados distintos, tabela equivalente, comparação
  compatível, falha com nova tentativa e boletim apenas com permissão de exportação.

### Diária média e RevPAR

Cartões, gráfico por tipo e evolução no painel; no seed de apresentação são calculados com
`calcularDiariaMedia`/`calcularRevpar`. A execução publicada (parte 16) ainda não os calcula.

### Faixas, participação e sazonalidade

Três blocos novos no painel (ver contrato). Faixas e feriados vêm do seed de apresentação;
participação é calculada das tabelas de pesquisa e respostas em qualquer ambiente.

### Pendências

- Integração com Looker Studio (decisão, credenciais, atualização) e consulta pública.
- Formato oficial do boletim (hoje, PDF/XLSX simples sem identidade visual aprovada) e distribuição (parte 14); exportação CSV com revisão.
- Metas de desempenho/volume, indicadores adicionais da parte 17 e previsão experimental (parte 19).
- Verificação visual em telas pequenas feita apenas por testes de estrutura; sem revisão manual em navegador.
