import type { TipoPeriodo } from './periodo.constants.js';

export type { TipoPeriodo };

/** Linha de `GET /periodos`. Datas sem hora no formato `YYYY-MM-DD`. */
export interface PeriodoLinha {
  id: number;
  tipo: TipoPeriodo;
  rotulo: string;
  dataInicio: string;
  dataFim: string;
}

/** Detalhe de `GET /periodos/:id`; a duração é derivada de `duracaoDias()`. */
export interface PeriodoDetalhe extends PeriodoLinha {
  /** Indicativo de uso por pesquisas, coletas ou indicadores. */
  emUso: boolean;
}

export interface EntradaPeriodo {
  tipo: TipoPeriodo;
  rotulo: string;
  dataInicio: string;
  dataFim: string;
}

/** Alteração parcial; datas e tipo só mudam em período sem uso registrado. */
export interface AlteracaoPeriodo {
  tipo?: TipoPeriodo;
  rotulo?: string;
  dataInicio?: string;
  dataFim?: string;
}
