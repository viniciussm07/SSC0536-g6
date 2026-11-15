import type { CapacidadeInventario } from './versao.types.js';

/**
 * Proposta técnica (não homologada pelo OTO): "completo" exige UH e leitos informados — decisão
 * explícita da equipe, nunca consequência de ausência de erro de tipo. `0` conta como informado.
 */
export function podeSerCompleta(capacidade: CapacidadeInventario): boolean {
  return (
    capacidade.totalUh.estado === 'informado' &&
    capacidade.leitos.estado === 'informado'
  );
}
