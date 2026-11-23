import type {
  OrigemColeta,
  SituacaoConferenciaFonte,
  TipoDia,
  UnidadePreco,
} from './fontes.constants.js';

/** Linha de `GET /coletas-diarias`. Valores monetários são decimais em texto. */
export interface ColetaDiariaLinha {
  id: number;
  empreendimentoId: number;
  empreendimentoNome: string;
  periodoId: number;
  periodoRotulo: string;
  fonte: string;
  /** YYYY-MM-DD */
  dataColeta: string;
  /** YYYY-MM-DD; deve pertencer ao período selecionado. */
  dataEstadia: string;
  tipoDia: TipoDia;
  valorDiaria: string;
  moeda: string;
  unidadePreco: UnidadePreco;
  origem: OrigemColeta;
  situacaoConferencia: SituacaoConferenciaFonte;
  referenciaOrigem: string | null;
  observacao: string | null;
  conferidoEm: string | null;
  conferidoPor: string | null;
}

export interface EntradaColetaDiaria {
  empreendimentoId: number;
  periodoId: number;
  /** Origem comercial do preço; enquadramento pendente de homologação. */
  fonte: string;
  dataColeta: string;
  dataEstadia: string;
  tipoDia: TipoDia;
  valorDiaria: string;
  moeda?: string;
  unidadePreco?: UnidadePreco;
  referenciaOrigem?: string | null;
  observacao?: string | null;
}

/** Alteração parcial; mudança de campo de negócio volta a observação para pendente. */
export interface AlteracaoColetaDiaria {
  empreendimentoId?: number;
  periodoId?: number;
  fonte?: string;
  dataColeta?: string;
  dataEstadia?: string;
  tipoDia?: TipoDia;
  valorDiaria?: string;
  moeda?: string;
  unidadePreco?: UnidadePreco;
  referenciaOrigem?: string | null;
  observacao?: string | null;
  situacaoConferencia?: SituacaoConferenciaFonte;
}
