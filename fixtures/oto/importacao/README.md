# Planilhas fictícias para importação

Geradas por `apps/backend/test/gerar-fixture-importacao.ts` no layout homologado da aba
`TABULAÇÃO` da planilha de ocupação consolidada. Nomes e valores são inventados; as colunas
calculadas existem, mas não são lidas. Não substituem as planilhas originais de
[docs/planilhas](../../../docs/planilhas/README.md), que permanecem intactas.

- `tabulacao-consolidado-ficticia.xlsx`: 4 linhas válidas (75,5%, 50%, 82,5% e 0% informado).
- `tabulacao-consolidado-ficticia-com-erros.xlsx`: escala ambígua, nome ausente, fórmula sem
  valor e ocupação ausente, para demonstrar a prévia com erros e avisos.

- `tabulacao-expectativa-ficticia.xlsx`: tabulação de **expectativa** (título "EXPECTATIVA PÁSCOA 2026", 3 diárias,
  abas `ACUMULADO MENSAL` e `CÁLCULO DA RECEITA ESTIMADA`) com um vínculo externo declarado, que é
  sinalizado e não seguido. Enviar a Consolidado como Expectativa (ou o inverso) gera `TIPO_DIVERGENTE`.

Use-as em `/importacoes` no ambiente local ou de apresentação. A leitura gera só uma prévia.

## Integridade

SHA-256 das planilhas fictícias (geração determinística):

- `tabulacao-consolidado-ficticia.xlsx`: `a4878ee907bcebdcb5583d873c20b2c29b3e55e7d03692837c258672aac6ca08`
- `tabulacao-consolidado-ficticia-com-erros.xlsx`: `b566095ebaa9924c4fbeeed3a6c738da81ecb1c9b6197e91cf92e0d50f793c0f`
- `tabulacao-expectativa-ficticia.xlsx`: `886468be82e19835bda9eb8ffdd3ccd67e339b2efc2572d73e2f3ca28f742463`

## Planilhas do OTO preenchidas (para testar a importação)

Em `preenchidas/`: **cópias das planilhas originais** de [docs/planilhas](../../../docs/planilhas/README.md)
com dados fictícios nas células de entrada (`C` nome e `L` % de ocupação da aba `TABULAÇÃO`). Estrutura, abas,
fórmulas, estilos e vínculos externos são os do original; os originais permanecem intactos. Geradas por
`apps/backend/test/gerar-planilhas-oto-preenchidas.ts` (determinístico). Os nomes são os 11 empreendimentos
ativos do [conjunto simulado](../producao-simulada/README.md), para o vínculo mostrar sugestões.

- `tabulacao-consolidada-2026-preenchida.xlsx`: "CONSOLIDADA CARNAVAL 2026", 5 diárias, 15 linhas. Inclui
  caixa e espaços diferentes, taxa em texto (`72,5%`), um nome repetido, dois nomes sem cadastro e uma
  linha sem taxa (ausência não é zero).
- `tabulacao-expectativa-2026-preenchida.xlsx`: "EXPECTATIVA PÁSCOA 2026", 3 diárias, 14 linhas, com os dois
  vínculos externos do original (sinalizados e não seguidos).

SHA-256:

- `preenchidas/tabulacao-consolidada-2026-preenchida.xlsx`: `956acc3cc2196262e67c29016537eaf6934c9b43677b14ec0053c0812b8fc9b0`
- `preenchidas/tabulacao-expectativa-2026-preenchida.xlsx`: `b538da7754b6ef3fb9922fb1bd98d477fbe87a4f1e0821a7c7e22e830fe5bc7b`
- `preenchidas/tabulacao-consolidada-demonstracao.xlsx`: versão curta para o vídeo de apresentação
  (título "Outubro 2026", 31 diárias, 8 linhas: 6 empreendimentos para vincular por sugestão, um nome desconhecido para rejeitar e uma
  linha sem taxa). Não inclui o Hotel Bela Vista, que responde pelo painel do empresário:
  `c82fca941ec54a54ebd7397edf520094ee2a1be782b06f7d40ae6d2a6089611e`
