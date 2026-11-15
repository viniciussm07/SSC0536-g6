/** Limites do subconjunto OData (ver docs/contratos/odata.md). */
export const ODATA_LIMITES = {
  filtroCaracteres: 2000,
  profundidade: 8,
  nos: 50,
  itensEm: 100,
  camposOrdenacao: 3,
  topPadrao: 20,
  topMaximo: 100,
  skipMaximo: 1_000_000,
} as const;

export const PARAMETROS_ODATA = [
  '$filter',
  '$orderby',
  '$top',
  '$skip',
  '$count',
] as const;
export const OPERADORES_COMPARACAO = [
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
] as const;
export const FUNCOES_TEXTO = ['contains', 'startswith', 'endswith'] as const;
