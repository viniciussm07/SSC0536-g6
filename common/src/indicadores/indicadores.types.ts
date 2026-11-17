import type {
  INDICADORES_TABULACAO,
  MOTIVOS_INDISPONIBILIDADE,
} from './indicadores.constants.js';

export type MotivoIndisponibilidade =
  (typeof MOTIVOS_INDISPONIBILIDADE)[number];

/**
 * Resultado de um indicador. `valor` é decimal exato em texto; ausência de dado, de
 * parâmetro ou de base nunca vira zero: o indicador fica indisponível com o motivo.
 */
export type ValorIndicador =
  | { estado: 'disponivel'; valor: string }
  | {
      estado: 'indisponivel';
      motivo: MotivoIndisponibilidade;
      detalhe: string;
    };

export type CodigoIndicadorTabulacao =
  (typeof INDICADORES_TABULACAO)[number]['codigo'];

export interface ErroEntradaIndicador {
  field: string;
  message: string;
}

/**
 * Meio de hospedagem da população elegível do período, com a capacidade vigente.
 * `null` significa dado ausente; zero é um valor informado.
 */
export interface MeioHospedagemTabulado {
  id: string;
  /** Categoria usada no recorte por tipo (ex.: hotel, resort, pousada). */
  tipo: string | null;
  uhs: number | null;
  leitos: number | null;
  /** Leitos ajustados pela média mínimo × máximo (decimal em texto). */
  leitosMedia: string | null;
  /** Percentual 0–100 em texto; `null` = não respondeu. */
  taxaOcupacao: string | null;
}

/** RHC agregado do período; sem cadastro individual das casas. */
export interface RhcTabulado {
  leitos: number | null;
  leitosMedia: string | null;
}

/** Limites inclusivos, na escala 0–100. */
export interface FaixaOcupacao {
  codigo: string;
  minimo: string;
  maximo: string;
}

/** Parâmetros pendentes de homologação; `null` torna indisponível o que depende deles. */
export interface ParametrosTabulacao {
  /** Participação do day use no total diário, 0–100. */
  percentualDayUse: string | null;
  /** Fator aplicado aos hospedados por dia antes do day use (TABULAÇÃO!L102). */
  fatorHospedadosDayUse: string | null;
  faixasOcupacao: FaixaOcupacao[] | null;
}

export interface EntradaTabulacao {
  /** Quantidade de diárias do período pesquisado (inteiro ≥ 1). */
  diasPeriodo: number | null;
  meios: MeioHospedagemTabulado[];
  rhc: RhcTabulado | null;
  parametros: ParametrosTabulacao;
}

export interface ResultadoFaixaOcupacao {
  codigo: string;
  meios: number;
  percentualMeios: string;
  leitos: ValorIndicador;
  percentualLeitos: ValorIndicador;
}

export type ResultadoFaixasOcupacao =
  | {
      estado: 'disponivel';
      /** Respondentes cuja taxa não cai em nenhuma faixa parametrizada. */
      meiosSemFaixa: number;
      faixas: ResultadoFaixaOcupacao[];
    }
  | {
      estado: 'indisponivel';
      motivo: MotivoIndisponibilidade;
      detalhe: string;
    };

export interface ResultadoOcupacaoTipo {
  tipo: string;
  respondentes: number;
  taxaOcupacao: ValorIndicador;
}

export interface ResultadoTabulacao {
  versaoFormula: number;
  /** Entradas inválidas bloqueiam todo o cálculo; nada é corrigido em silêncio. */
  erros: ErroEntradaIndicador[];
  respondentes: number;
  indicadores: Record<CodigoIndicadorTabulacao, ValorIndicador>;
  faixasOcupacao: ResultadoFaixasOcupacao;
  ocupacaoPorTipo: ResultadoOcupacaoTipo[];
}

export interface EntradaLeitosMedia {
  uhs: number | null;
  /** Parâmetro `leitos_media.minimo_por_uh`. */
  leitosMinimoPorUh: string | null;
  leitosMaximoPorUh: number | null;
}

export interface EmpreendimentoDiaria {
  id: string;
  /** Preços observados no período (decimais em texto); `null` = dia sem preço. */
  diarias: (string | null)[];
  /** Peso da média ponderada: leitos do empreendimento. */
  leitos: number | null;
}

export interface EntradaDiariaMedia {
  empreendimentos: EmpreendimentoDiaria[];
}

export interface ResultadoDiariaMedia {
  versaoFormula: number;
  erros: ErroEntradaIndicador[];
  porEmpreendimento: { id: string; diariaMedia: ValorIndicador }[];
  aritmetica: ValorIndicador;
  ponderada: ValorIndicador;
}

export interface EntradaRevpar {
  diariaMedia: string | null;
  /** Percentual 0–100 do mesmo recorte da diária. */
  taxaOcupacao: string | null;
}
