# Planilhas fictícias para importação

Geradas por `apps/backend/test/gerar-fixture-importacao.ts` no layout homologado da aba
`TABULAÇÃO` da planilha de ocupação consolidada. Nomes e valores são inventados; as colunas
calculadas existem, mas não são lidas. Não substituem as planilhas originais de
[docs/planilhas](../../../docs/planilhas/README.md), que permanecem intactas.

- `tabulacao-consolidado-ficticia.xlsx`: 4 linhas válidas (75,5%, 50%, 82,5% e 0% informado).
- `tabulacao-consolidado-ficticia-com-erros.xlsx`: escala ambígua, nome ausente, fórmula sem
  valor e ocupação ausente, para demonstrar a prévia com erros e avisos.

Use-as em `/importacoes` no ambiente local ou de apresentação. A leitura gera só uma prévia.

## Integridade

SHA-256 das planilhas fictícias (geração determinística):

- `tabulacao-consolidado-ficticia.xlsx`: `a4878ee907bcebdcb5583d873c20b2c29b3e55e7d03692837c258672aac6ca08`
- `tabulacao-consolidado-ficticia-com-erros.xlsx`: `b566095ebaa9924c4fbeeed3a6c738da81ecb1c9b6197e91cf92e0d50f793c0f`
