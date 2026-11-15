/** Extrai `data` de uma resposta `{ data }` validando o formato; nunca devolve JSON não conferido. */
export function lerDados<T>(
  value: unknown,
  validar: (value: unknown) => value is T,
  mensagem = 'Resposta inesperada do servidor.',
): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !validar(value.data)
  )
    throw new Error(mensagem);
  return value.data;
}
