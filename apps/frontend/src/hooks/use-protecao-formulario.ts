import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useProtecaoAlteracoes } from './use-protecao-alteracoes';

interface Formulario {
  readonly store: {
    subscribe: (listener: () => void) => { unsubscribe: () => void };
  };
  readonly state: { isDefaultValue: boolean; isSubmitting: boolean };
}
/** Lê diretamente o estado do TanStack Form, sem cópia dos campos. */
export function useProtecaoFormulario(form: Formulario) {
  const protecao = useProtecaoAlteracoes();
  const id = useRef(Symbol('formulario'));
  useEffect(
    () =>
      protecao?.registrar(id.current, {
        assinar: (listener) => {
          const subscription = form.store.subscribe(listener);
          return () => subscription.unsubscribe();
        },
        alterado: () => !form.state.isDefaultValue,
        enviando: () => form.state.isSubmitting,
      }),
    [form, protecao],
  );
}
/** Congela somente a base inicial; os valores editados continuam no TanStack Form. */
export function useBaseFormulario<T>(
  valor: T,
): [T, Dispatch<SetStateAction<T>>] {
  return useState(() => valor);
}
