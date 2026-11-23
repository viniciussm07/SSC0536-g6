# Dados simulados de aparência realista

`dados.json` (gerado por `gerar.py`, determinístico) segue o formato de
[scenario.json](../scenario.json): 12 hospedagens, 15 usuários, inventários, 9 pesquisas mensais
(jan–set/2026), 92 respostas e 220 coletas de diária. Tudo é inventado: e-mails em domínio
reservado `.test`, sem CNPJ e sem credenciais. Os indicadores do ambiente de apresentação não
vêm do JSON: o seed os calcula com as fórmulas v1 sobre as respostas e os inventários (veja
`apps/backend/prisma/indicadores-apresentacao.ts`).

**Não está ligado ao seed.** `assertSeedTarget` bloqueia produção de propósito; carregar estes
dados lá exige decisão e implementação separadas. Se forem expostos como reais, usuários e
relatórios passarão a tratar números inventados como dados oficiais.

## Ambiente de apresentação

`pnpm db:seed:apresentacao` carrega `dados.json` em um banco **próprio e vazio** cujo nome termina
em `_apresentacao`. Exige `OTO_AMBIENTE=apresentacao`, `DATABASE_URL` e `APRESENTACAO_SENHA`
(mín. 12 caracteres, não versionada; vale para todos os usuários ativos). Aplique antes
`pnpm db:deploy`. O seed de `_dev`/`_test` e o bloqueio de produção seguem intactos.

### Indicadores da apresentação

O seed também grava, para os 9 meses (jan–set/2026, consolidado), os 20 indicadores da fórmula v1
(taxa de ocupação, cobertura, leitos, turistas, por tipo de hospedagem), calculados sobre as
respostas e inventários simulados, com um RHC agregado simulado e conferido (14 a 16 casas de
5 leitos). Parâmetros: `day_use.percentual` 15,15, fator 1 e mínimo de 1 leito por UH, as hipóteses
das planilhas (`fixtures/oto/indicadores-referencia.json`). Entram como carga histórica, visíveis a
administrador, gestor e visualizador. **Metodologia não homologada**; números inventados.
Para recarregar, use um banco `_apresentacao` vazio (o seed não altera banco já carregado).

**Diária média e RevPAR:** as 220 coletas de diária (jun–out/2026) entram como `conferida` e o seed
calcula a diária média (aritmética e ponderada por leitos) e o RevPAR (diária ponderada × taxa de
ocupação do mesmo período), no total e por tipo de hospedagem. Outubro tem diária, mas não tem
pesquisa de ocupação: o RevPAR dele fica indisponível. É preço ofertado, não faturamento.

**Faixas de ocupação e feriados:** o seed também grava, por mês, a proporção de meios e de leitos
respondentes em cada faixa de ocupação (excelente, ótima, boa, regular e baixa, limites da planilha,
pendentes de homologação) e cadastra 8 feriados prolongados de 2026 como períodos do tipo
`feriado_prolongado`, só como calendário (sem resultado) para a sazonalidade.
