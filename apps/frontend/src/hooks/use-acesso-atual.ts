import { useContext } from 'react';
import { ContextoAutenticadoContext } from '@/components/contexto-autenticado/context';

export function useContextoAutenticado() {
  const contexto = useContext(ContextoAutenticadoContext);
  if (!contexto)
    throw new Error('Use este hook somente dentro da área autenticada.');
  return contexto;
}

export function useAcessoAtual() {
  return useContextoAutenticado().acesso;
}
