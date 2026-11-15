import { useContext } from 'react';
import { ContextoEntidadeContext } from '@/components/contexto-entidade/context';

export function useContextoEntidade() {
  const contexto = useContext(ContextoEntidadeContext);
  if (!contexto)
    throw new Error('Use este hook somente dentro da área autenticada.');
  return contexto;
}
