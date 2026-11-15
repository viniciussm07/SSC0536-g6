# 12 — Publicação, prazo e acompanhamento das pesquisas

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF20, RF24, RF30 e RF31; RNF09 e RNF14.

**Dependências:** [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md), [10](10-periodos-e-calendario.md), [11](11-modelos-e-versoes-de-pesquisa.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).

O controle orienta edições e respondentes, mas não é uma resposta de ocupação. Confirmar elegibilidade, datas e significado das marcações.

## Objetivo

Criar edições Expectativa/Consolidado, controlar seu ciclo e acompanhar quem respondeu.

## Backend e dados

- Implementar criação de `Pesquisa` e `PesquisaPergunta` vinculadas a versão de modelo e períodos.
- Validar abertura/prazo no fuso operacional e compatibilidade dos períodos com tipo de coleta.
- Definir ciclo rascunho → aberta → encerrada e eventual reabertura autorizada. O schema
  atual documenta aberta/encerrada; rascunho/reabertura exigem modelagem e regras explícitas.
- Definir o público elegível na abertura (por exemplo, segmento e situação cadastral) e
  persistir a seleção quando necessário. A base atual não registra destinatários de cada edição.
- Diferenciar elegíveis, convidados, respondentes e pendentes; denominadores de participação
  não podem depender de filtros que mudem silenciosamente depois da abertura.
- Autorizar recebimento com base no prazo/estado do servidor, inclusive se o agendamento
  de encerramento falhar. Resolver concorrência entre fechamento e envio na transação.
- Emitir evento após abertura confirmada para a parte 14 e auditar mudanças de prazo/estado.

## Frontend

Gestão de edições, tipo de coleta e períodos sempre visíveis, revisão antes de abrir,
lista de respondentes/pendentes e ações de encerramento conforme permissão.
Exibir estados e contagens separadamente de taxas de ocupação.

## Critérios de aceite e testes

- Pesquisa futura não recebe resposta antes da abertura; encerrada/expirada rejeita novos envios.
- Fechamento manual e vencimento têm comportamento coerente mesmo sem job agendado.
- Acompanhamento identifica respondentes por empreendimento sem expor informações indevidas.
- Alterar prazo exige autorização e registro; possível reabertura segue regra homologada.
- Falha em notificar não reverte nem duplica a abertura da edição.
