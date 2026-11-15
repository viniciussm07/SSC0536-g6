import type {
  EventoAuditoriaResumo,
  EventoAuditoriaDetalhe,
  SnapshotAuditoria,
} from './auditoria.types.js';
const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
function json(v: unknown, nivel = 0): boolean {
  if (nivel > 20) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean')
    return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return Array.isArray(v)
    ? v.every((x) => json(x, nivel + 1))
    : objeto(v) && Object.values(v).every((x) => json(x, nivel + 1));
}
export const isSnapshotAuditoria = (v: unknown): v is SnapshotAuditoria =>
  objeto(v) && json(v);
export function isEventoAuditoriaResumo(
  v: unknown,
): v is EventoAuditoriaResumo {
  return (
    objeto(v) &&
    id(v.id) &&
    typeof v.entidade === 'string' &&
    v.entidade.length > 0 &&
    id(v.entidadeId) &&
    typeof v.acao === 'string' &&
    v.acao.length > 0 &&
    typeof v.em === 'string' &&
    /^\d{4}-\d\d-\d\dT/.test(v.em) &&
    v.em.endsWith('Z') &&
    Number.isFinite(Date.parse(v.em)) &&
    (v.usuarioId === null || id(v.usuarioId)) &&
    typeof v.autor === 'string' &&
    v.autor.length > 0 &&
    ((v.origem === 'manual' && id(v.usuarioId) && v.processo === null) ||
      (v.origem === 'automatica' &&
        v.usuarioId === null &&
        typeof v.processo === 'string' &&
        v.processo.length > 0)) &&
    (v.processo === null || typeof v.processo === 'string') &&
    (v.correlacaoId === null || typeof v.correlacaoId === 'string')
  );
}
export function isEventoAuditoriaDetalhe(
  v: unknown,
): v is EventoAuditoriaDetalhe {
  return (
    isEventoAuditoriaResumo(v) &&
    'antes' in v &&
    (v.antes === null || isSnapshotAuditoria(v.antes)) &&
    'depois' in v &&
    (v.depois === null || isSnapshotAuditoria(v.depois)) &&
    'diferencas' in v &&
    Array.isArray(v.diferencas) &&
    v.diferencas.every(
      (d) =>
        objeto(d) &&
        typeof d.campo === 'string' &&
        json(d.antes) &&
        json(d.depois) &&
        typeof d.antesPresente === 'boolean' &&
        typeof d.depoisPresente === 'boolean',
    )
  );
}
