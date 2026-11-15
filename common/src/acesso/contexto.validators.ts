// IDs de empreendimento são inteiros positivos de 32 bits (INTEGER do PostgreSQL).
const ID_CONTEXTO = /^[1-9]\d{0,9}$/;
const ID_MAXIMO = 2_147_483_647;

export type ContextoEntidadeEntrada =
  { valido: true; id: number | null } | { valido: false };

/** Interpreta o valor bruto do cabeçalho: ausente = sem contexto; inválido nunca vira null. */
export function interpretarContextoEntidade(
  valor: unknown,
): ContextoEntidadeEntrada {
  if (valor === undefined) return { valido: true, id: null };
  if (typeof valor !== 'string' || !ID_CONTEXTO.test(valor))
    return { valido: false };
  const id = Number(valor);
  return id <= ID_MAXIMO ? { valido: true, id } : { valido: false };
}
