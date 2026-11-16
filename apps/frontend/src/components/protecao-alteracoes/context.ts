import { createContext } from 'react';

export interface FormularioProtegido {
  assinar: (listener: () => void) => () => void;
  alterado: () => boolean;
  enviando: () => boolean;
}
export interface ProtecaoAlteracoes {
  registrar: (id: symbol, formulario: FormularioProtegido) => () => void;
  executar: (acao: () => unknown) => Promise<boolean>;
}
export const ProtecaoContext = createContext<ProtecaoAlteracoes | null>(null);
