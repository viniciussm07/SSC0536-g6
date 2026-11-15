import { useEffect, useState } from 'react';

/** Repete o valor após um intervalo sem mudanças (evita uma consulta por tecla digitada). */
export function useValorAtrasado<T>(valor: T, atrasoMs = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);
  return atrasado;
}
