# 07 — Auditoria transacional e consulta de alterações

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF39; RNF03 e RNF10.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [02](02-autenticacao-e-contas.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Os hashes e locais de origem documentados nos READMEs servem à proveniência. Planilhas não fornecem identidades autenticadas nem substituem uma trilha de alterações.

## Objetivo

Tornar cada mutação de negócio atribuível a uma identidade e permitir investigação de alterações.

## Backend e dados

- Definir serviço de auditoria sobre `Auditoria` com usuário, entidade/ID, ação,
  valores anteriores/posteriores e instante; autor e horário são determinados no servidor.
- Integrar auditoria à mesma transação de cadastros, vínculos, inventários, pesquisas,
  respostas, importações e decisões de publicação. Falha em gravar auditoria reverte a mutação.
- Planejar identidade e origem para processos automáticos/importações e correlação por lote
  ou operação; não atribuir uma automação a um usuário arbitrário nem forjar ação humana.
- Diferenciar log operacional e trilha de negócio. Excluir senhas, tokens, segredos e
  dados sem necessidade dos snapshots; definir acesso e retenção com o OTO.
- Proteger a trilha de alteração/exclusão pelos fluxos comuns. Definir permissões do usuário
  de aplicação para evitar mutações diretas desnecessárias na trilha.

## API e interface

Listagem paginada e filtros por entidade, período, autor e ação; detalhe com diferenças
antes/depois. Guardar contexto suficiente para leitura mesmo após inativação da entidade.
A consulta fica limitada ao público autorizado na parte 03.

## Critérios de aceite e testes

- Toda operação crítica prevista em cada módulo possui evidência auditável.
- Exceção no meio de uma transação não deixa dado alterado sem registro correspondente.
- Autor informado no corpo da requisição não substitui a identidade autenticada.
- Usuários comuns não editam/removem eventos e segredos não aparecem na consulta.
- Importação e processamento automático são distinguíveis de alterações manuais.

## Dependência transversal

O mecanismo básico nasce com a autenticação. Cada funcionalidade deve integrar sua própria
trilha antes de ser considerada pronta; a auditoria não é uma tarefa adiada para o final.
