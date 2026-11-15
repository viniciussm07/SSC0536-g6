import type { ReactNode } from 'react';
import {
  ContextoAutenticadoContext,
  type ContextoAutenticado,
} from './context';

export function ContextoAutenticadoProvider({
  valor,
  children,
}: {
  valor: ContextoAutenticado;
  children: ReactNode;
}) {
  return (
    <ContextoAutenticadoContext.Provider value={valor}>
      {children}
    </ContextoAutenticadoContext.Provider>
  );
}
