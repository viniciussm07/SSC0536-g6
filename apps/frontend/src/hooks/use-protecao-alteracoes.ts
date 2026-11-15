import { useContext } from 'react';
import { ProtecaoContext } from '@/components/protecao-alteracoes/context';

export function useProtecaoAlteracoes() {
  const contexto = useContext(ProtecaoContext);
  // Componentes isolados podem não ter navegação; a aplicação instala o provider na raiz.
  return contexto;
}
