import type { ValorColetado } from '../coleta/valor-coletado.types.js';

/** Candidato canônico; a admissibilidade dos estados é conferida antes de persistir. */
export interface CapacidadeInventarioColetada {
  totalUh: ValorColetado<number>;
  leitos: ValorColetado<number>;
  maxLeitosPorUh: ValorColetado<number>;
  uhsPcd: ValorColetado<number>;
  funcFixos: ValorColetado<number>;
  funcTemporarios: ValorColetado<number>;
  funciona24h: ValorColetado<boolean>;
  checkin: ValorColetado<string>;
  checkout: ValorColetado<string>;
}

export type ResultadoCapacidadeInventario =
  | { valido: true; data: CapacidadeInventarioColetada }
  | {
      valido: false;
      erros: { field: string; message: string }[];
    };
