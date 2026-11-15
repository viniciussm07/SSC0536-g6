import type {
  DiferencaAuditoria,
  SnapshotAuditoria,
  ValorAuditoria,
} from './auditoria.types.js';
const canonico = (valor: ValorAuditoria): string => {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor !== null && typeof valor === 'object')
    return `{${Object.keys(valor)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`)
      .join(',')}}`;
  return JSON.stringify(valor);
};
/** Compara campos do snapshot sem confundir ausência, null, zero e false. */
export function diferencasAuditoria(
  antes: SnapshotAuditoria | null,
  depois: SnapshotAuditoria | null,
): DiferencaAuditoria[] {
  const a = antes ?? {},
    d = depois ?? {};
  return [...new Set([...Object.keys(a), ...Object.keys(d)])]
    .sort()
    .flatMap((campo) => {
      const antesPresente = Object.hasOwn(a, campo),
        depoisPresente = Object.hasOwn(d, campo);
      return antesPresente === depoisPresente &&
        canonico(a[campo] ?? null) === canonico(d[campo] ?? null)
        ? []
        : [
            {
              campo,
              antes: a[campo] ?? null,
              depois: d[campo] ?? null,
              antesPresente,
              depoisPresente,
            },
          ];
    });
}
