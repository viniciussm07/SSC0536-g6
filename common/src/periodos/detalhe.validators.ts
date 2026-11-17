import { TIPOS_PERIODO } from './periodo.constants.js';
import type { PeriodoDetalhe, PeriodoLinha } from './periodo.types.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const data = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function isPeriodoLinha(v: unknown): v is PeriodoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    typeof v.tipo === 'string' &&
    (TIPOS_PERIODO as readonly string[]).includes(v.tipo) &&
    typeof v.rotulo === 'string' &&
    data(v.dataInicio) &&
    data(v.dataFim)
  );
}

export function isPeriodoDetalhe(v: unknown): v is PeriodoDetalhe {
  return (
    isPeriodoLinha(v) && typeof (v as unknown as Objeto).emUso === 'boolean'
  );
}
