import type { ErroCampo } from '@ssc0536/common';

export const OPCOES_SIM_NAO = [
  { value: 'nao', label: 'Não' },
  { value: 'sim', label: 'Sim' },
];
export const ROTULOS_SELECAO = {
  unica: 'Escolha única',
  multipla: 'Múltipla escolha',
} as const;
export const ROTULOS_ESTADO_ITEM = {
  sim: 'Sim',
  nao: 'Não',
  nao_se_aplica: 'Não se aplica',
  nao_informado: 'Não informado',
} as const;

export const simNao = (valor: boolean) => (valor ? 'Sim' : 'Não');

/**
 * Erros do validador compartilhado no formato do TanStack Form: por campo (`{ fields }`) ou,
 * quando o erro é do corpo inteiro (ex.: nada a alterar), uma mensagem do formulário.
 */
export function errosParaFormulario(erros: ErroCampo[]) {
  const geral = erros.find((e) => e.field === 'corpo');
  if (geral) return geral.message;
  const fields: Record<string, string> = {};
  for (const { field, message } of erros) fields[field] ??= message;
  return { fields };
}
