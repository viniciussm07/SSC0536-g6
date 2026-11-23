# Dados simulados de aparência realista

`dados.json` (gerado por `gerar.py`, determinístico) segue o formato de
[scenario.json](../scenario.json): 12 hospedagens, 15 usuários, inventários, 9 pesquisas mensais
(jan–set/2026), 92 respostas e 220 coletas de diária. Tudo é inventado: e-mails em domínio
reservado `.test`, sem CNPJ e sem credenciais. Indicadores não foram gerados, pois a metodologia
do OTO ainda não está homologada.

**Não está ligado ao seed.** `assertSeedTarget` bloqueia produção de propósito; carregar estes
dados lá exige decisão e implementação separadas. Se forem expostos como reais, usuários e
relatórios passarão a tratar números inventados como dados oficiais.

## Ambiente de apresentação

`pnpm db:seed:apresentacao` carrega `dados.json` em um banco **próprio e vazio** cujo nome termina
em `_apresentacao`. Exige `OTO_AMBIENTE=apresentacao`, `DATABASE_URL` e `APRESENTACAO_SENHA`
(mín. 12 caracteres, não versionada; vale para todos os usuários ativos). Aplique antes
`pnpm db:deploy`. O seed de `_dev`/`_test` e o bloqueio de produção seguem intactos.
