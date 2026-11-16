import { TIPOS_PERIODO } from './periodo.constants.js';
import type { TipoPeriodo } from './periodo.types.js';

export function isTipoPeriodo(value: unknown): value is TipoPeriodo {
  return (TIPOS_PERIODO as readonly unknown[]).includes(value);
}
