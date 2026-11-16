/** Caminhos sob /api. */
export const PERIODO_RECURSOS = {
  periodos: '/periodos',
} as const;

/** Mês de referência ou feriado prolongado; sobreposição entre tipos é permitida. */
export const TIPOS_PERIODO = ['mes', 'feriado_prolongado'] as const;
export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

export const LIMITES_PERIODOS = {
  rotulo: 120,
  /** Trava de sanidade: nenhum período oficial deve se aproximar disso. */
  duracaoMaximaDias: 666,
} as const;

/** Data civil sem hora: `YYYY-MM-DD`, correspondente a uma data real do calendário. */
export const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;
