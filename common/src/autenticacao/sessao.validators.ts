import type { SessaoAtual } from './sessao.types.js';
export function isSessaoAtual(value: unknown): value is SessaoAtual {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('usuario' in value) ||
    !('expiraEm' in value)
  )
    return false;
  const u = value.usuario;
  return (
    typeof value.expiraEm === 'string' &&
    /^\d{4}-\d\d-\d\dT.*Z$/.test(value.expiraEm) &&
    Number.isFinite(Date.parse(value.expiraEm)) &&
    typeof u === 'object' &&
    u !== null &&
    'id' in u &&
    Number.isInteger(u.id) &&
    Number(u.id) > 0 &&
    'nome' in u &&
    typeof u.nome === 'string' &&
    'email' in u &&
    typeof u.email === 'string' &&
    'perfil' in u &&
    typeof u.perfil === 'string'
  );
}
