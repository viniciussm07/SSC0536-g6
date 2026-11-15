# 10 — Períodos de referência e calendário turístico

**Situação:** planejado; não implementado por este documento.

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
