# 12 — Publicação, prazo e acompanhamento das pesquisas

**Situação:** primeiro incremento implementado (ciclo rascunho → aberta → encerrada,
edição presa à versão do modelo, público congelado na abertura e acompanhamento de
respondentes). Regras de compatibilidade, elegibilidade e reabertura são propostas
técnicas pendentes de confirmação do OTO; não há homologação.

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

## Registro da entrega (primeiro incremento)

- **Migration** `20261124000000_publicacao_pesquisas`:
  - `pesquisa.modelo_versao` com FK para o snapshot `pesquisa_modelo_versao`; a edição
    congela a versão vigente na criação do rascunho;
  - ciclo persistido com `CHECK`s de estado, tipo de coleta, `prazo > abertura` e
    coerência de `aberta_em`/`encerrada_em`;
  - `segmento_ids` (filtro de público) e `pesquisa_destinatario` (público congelado);
  - `pesquisa_evento`, caixa de saída única por edição e tipo, para a parte 14;
  - backfill da v1 dos modelos sem histórico (lacuna da parte 11) e de `aberta_em`/
    `encerrada_em` das edições legadas. Testado em base com dados legados;
    `prisma migrate diff` sem divergência com o schema.
- **Common** (`pesquisas/edicao.*`, `pesquisas/ciclo.validators.ts`): contratos de
  edição, detalhe, participação e destinatário; validação de entrada com instantes
  ISO 8601 conferidos no calendário; `situacaoPesquisa()` (rascunho, agendada,
  recebendo, expirada, encerrada) pelo relógio, com abertura inclusiva e prazo
  exclusivo; `conferirPeriodosCompativeis()` no fuso `America/Sao_Paulo`; esquemas OData
  `pesquisas` e `destinatarios`.
- **Backend** (`EdicoesPesquisaService`):
  - `GET /pesquisas` e `GET /pesquisas/:id/destinatarios` são coleções OData com CSV;
    `situacaoResposta` e `respondidaEm` são campos virtuais filtráveis;
  - `GET/PUT/DELETE /pesquisas/:id` e `POST /pesquisas/:id/abertura|encerramento`;
  - perguntas geradas como campo da versão × período;
  - após a abertura, só título, prazo e (enquanto agendada) abertura mudam. Prorrogar
    uma edição expirada é recusado (`PESQUISA_REABERTURA_PENDENTE`). Rascunho é excluível.
  - Abertura e encerramento travam a linha (`FOR UPDATE`) e leem o relógio depois da
    trava. Destinatários, evento e auditoria entram na mesma transação: falha posterior
    de notificação não reverte nem duplica a abertura.
  - `exigirRecebimento()` (para a parte 13) usa `FOR SHARE`, estado, prazo e público.
    Expiração não depende de job.
  - Correção da parte 11: remover do modelo um campo usado por edição responde
    409 `CAMPO_EM_USO` (antes era 500).
- **Frontend:** página Edições de pesquisa.
  - Grade OData com horários de Brasília.
  - Formulário TanStack Form de rascunho e alteração.
  - Revisão com confirmação antes de abrir, encerrar ou excluir.
  - Contagens de participação separadas de taxas de ocupação e grade de destinatários.
- **Verificação local:**
  - Common: 190 testes.
  - Backend: 52 + 6 unitários; integração sequencial (`pnpm test:integration`) com 76 + 5.
  - Frontend: 160 testes.
  - Também passaram lint, typecheck, build e `db:validate`.
  - Em `pnpm test` (arquivos em paralelo no mesmo banco), 3 testes de acesso/cadastro
    que comparam contadores globais falharam por interferência entre suítes.
  - Evidência técnica local, sem GitHub Actions nem homologação.

Pendências (dependem do OTO):

- **Compatibilidade de períodos (proposta):** em Expectativa, o prazo vai até o fim do
  período; em Consolidado, o período termina antes da data do prazo.
- **Público elegível (proposta):** empreendimentos `ativo`, opcionalmente por segmento.
  Situação cadastral/Cadastur e aceite de participação do controle legado não entram no
  critério.
- **Reabertura e prorrogação de edição expirada:** a regra ainda não existe; hoje ambas
  são recusadas.
- **Edições legadas:** as que misturam Expectativa e Consolidado viram edições
  relacionadas; a carga desses metadados depende dos códigos de edição.
- **Convidados ≠ destinatários:** convite e envio pertencem à parte 14.

O público congelado sai do estado cadastral do momento da abertura.
