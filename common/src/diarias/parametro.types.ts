import type { SituacaoParametro } from './fontes.constants.js';

/** Parâmetro de cálculo com vigência; valores são decimais em texto. */
export interface ParametroCalculoLinha {
  id: number;
  chave: string;
  valor: string;
  unidade: string;
  /** YYYY-MM-DD */
  vigenciaInicio: string;
  /** YYYY-MM-DD */
  vigenciaFim: string | null;
  fonte: string | null;
  situacao: SituacaoParametro;
  observacao: string | null;
}

export interface EntradaParametroCalculo {
  chave: string;
  valor: string;
  unidade?: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  fonte?: string | null;
  situacao?: SituacaoParametro;
  observacao?: string | null;
}

export interface AlteracaoParametroCalculo {
  chave?: string;
  valor?: string;
  unidade?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string | null;
  fonte?: string | null;
  situacao?: SituacaoParametro;
  observacao?: string | null;
}
