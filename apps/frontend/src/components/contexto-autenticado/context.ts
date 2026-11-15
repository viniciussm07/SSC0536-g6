import { createContext } from 'react';
import type { AcessoAtual, IdentidadeSessao } from '@ssc0536/common';

export interface ContextoAutenticado {
  usuario: IdentidadeSessao;
  acesso: AcessoAtual;
}

export const ContextoAutenticadoContext =
  createContext<ContextoAutenticado | null>(null);
