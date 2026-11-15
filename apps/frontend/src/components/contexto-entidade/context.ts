import { createContext } from 'react';
import type { EntidadeContexto } from '@/utils/contexto-entidade';

export interface ContextoEntidadeValor {
  /** Empreendimento contextualizado; null = visão geral do OTO. */
  entidade: EntidadeContexto | null;
  selecionar: (entidade: EntidadeContexto | null) => Promise<boolean>;
  /** O acesso permite escolher um empreendimento. */
  podeSelecionar: boolean;
  /** Perfis de escopo global podem permanecer na visão geral. */
  podeVisaoGeral: boolean;
}

export const ContextoEntidadeContext =
  createContext<ContextoEntidadeValor | null>(null);
