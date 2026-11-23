import type { ErroCampo } from '@ssc0536/common';

/** Erros do validador do common no formato do TanStack Form. */
export function errosDoValidador(erros: readonly ErroCampo[]) {
  const geral = erros.find((e) => e.field === '' || e.field === 'corpo');
  if (geral) return geral.message;
  const fields: Record<string, string> = {};
  for (const { field, message } of erros) fields[field] ??= message;
  return { fields };
}

export function opcoes(
  linhas: readonly { id: number; nome: string }[],
): { value: string; label: string }[] {
  return [
    { value: '', label: 'Selecione…' },
    ...linhas.map((linha) => ({
      value: String(linha.id),
      label: linha.nome,
    })),
  ];
}
