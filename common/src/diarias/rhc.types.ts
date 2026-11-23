import type {
  OrigemColeta,
  SituacaoConferenciaFonte,
} from './fontes.constants.js';

/** Agregado de RHC por período; não há cadastro pessoal das casas no MER. */
export interface RhcPeriodoLinha {
  id: number;
  periodoId: number;
  periodoRotulo: string;
  qtdRhc: number;
  leitos: number;
  origem: OrigemColeta;
  situacaoConferencia: SituacaoConferenciaFonte;
  revisao: number;
  observacao: string | null;
  conferidoEm: string | null;
  conferidoPor: string | null;
}

export interface EntradaRhcPeriodo {
  periodoId: number;
  qtdRhc: number;
  leitos: number;
  observacao?: string | null;
}

export interface AlteracaoRhcPeriodo {
  periodoId?: number;
  qtdRhc?: number;
  leitos?: number;
  observacao?: string | null;
  situacaoConferencia?: SituacaoConferenciaFonte;
}
