# 10 — Períodos de referência e calendário turístico

**Situação:** primeiro incremento implementado (gestão de `Periodo` com identidade canônica, duração inclusiva, proteção de histórico e auditoria atômica); calendário oficial do OTO e regra de unicidade permanecem pendentes de confirmação.

**Rastreabilidade:** RF09, RF24 e RF28; RNF09 e RNF12.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).

Usar meses e feriados identificados nos cabeçalhos como exemplos do calendário. Confirmar datas e recortes; o rótulo de uma edição não basta para inferir todo o intervalo.

## Objetivo

Identificar meses e períodos especiais de forma única e consistente entre pesquisas,
importações, capacidade e indicadores.

## Backend e dados

- Implementar gestão de `Periodo` com tipo, rótulo e datas, distinguindo mês e feriado prolongado.
- Validar início/fim, duração inclusiva definida no contrato e normalização de datas sem hora.
- Definir identidade canônica do período; impedir duplicação equivalente conforme regra aprovada.
  A ausência de unicidade adicional no schema exige uma decisão antes da migration correspondente.
- Permitir mês e feriado com datas sobrepostas quando representarem recortes distintos;
  evitar dupla contagem em agregações e comparações que misturem esses recortes.
- Controlar edição de períodos já usados em respostas/cálculos; mudanças exigem revisão
  de dependências e auditoria, em vez de alterar silenciosamente o significado do histórico.
- Definir calendário com o OTO; não gerar feriados/eventos de uma API externa por presunção.

## Frontend

Lista e formulário de períodos para operadores autorizados, seleção por mês/recorte
especial, datas visíveis e indicação de uso por pesquisas e indicadores.
Não confundir período pesquisado com abertura/prazo de resposta ou data da coleta.

## Critérios de aceite e testes

- Mês, mudança de ano, fevereiro bissexto e feriado de um dia possuem duração correta.
- Importação e formulário referenciam o mesmo período canônico.
- Referência histórica não muda sem autorização e tratamento das dependências.
- Comparação entre mês e feriado não produz soma duplicada sem metodologia definida.

## Entregáveis

Contratos de período, calendário inicial aprovado, validações, tela de gestão e fixtures
que serão reutilizadas nas pesquisas e nos cálculos.

## Registro da entrega (frente 2 — fatia F2-A)

- **Migration:** `20261122000000_periodos_identidade_e_modelos_versionados` cria a
  unicidade canônica `[tipo, dataInicio, dataFim]` (regra proposta, sujeita à confirmação
  do OTO); `20261123000000_imutabilidade_versoes_modelo` protege os snapshots de modelo.
  Sem drift nos bancos de desenvolvimento e teste.
- **Common:** contratos `PeriodoLinha`/`PeriodoDetalhe`/`EntradaPeriodo`/`AlteracaoPeriodo`,
  duração inclusiva (`duracaoDias`), validação de datas civis (fevereiro bissexto incluso),
  validação de intervalo com limite de sanidade e esquema OData `periodos`.
- **Backend:** módulo `periodos` — coleção OData (`GET /periodos` com `$filter/$orderby/
$top/$skip/$count`) e exportação CSV, detalhe com `emUso`, criação com recusa de
  duplicidade (`PERIODO_DUPLICADO`, 409) e alteração que bloqueia datas/tipo em período já
  usado (`PERIODO_EM_USO`, 409) permitindo só o rótulo; auditoria gravada na mesma transação.
- **Frontend:** página Períodos com grade (`GradeColecao`), formulário com duração calculada
  ao vivo, proteção de alterações e mensagens amigáveis para os erros 409.
- **Verificação local:** common 176; backend unitário 51+6 e integração 71+5
  (PostgreSQL/PostGIS de teste, incluindo permissões por perfil, OData, auditoria e
  imutabilidade por gatilho); frontend 153. Evidência técnica local, sem homologação
  nem GitHub Actions.

Pendências: aprovação do OTO para o calendário oficial (as datas de demonstração são
fictícias) e para a regra de unicidade canônica; inclusão de períodos de demonstração no
cenário compartilhado (`fixtures/oto`) a coordenar com a equipe para não invalidar
marcadores de bases locais.
