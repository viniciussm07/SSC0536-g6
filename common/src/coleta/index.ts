export {
  CONTRATO_DADOS_VERSAO,
  FUSO_OPERACIONAL,
} from './valor-coletado.constants.js';
export type {
  ValorColetado,
  ResultadoNormalizacao,
  EscalaPercentual,
} from './valor-coletado.types.js';
export {
  normalizarTextoColetado,
  normalizarQuantidadeColetada,
  normalizarBooleanoColetado,
  normalizarDataColetada,
  normalizarHorarioColetado,
  normalizarDecimalColetado,
  normalizarPercentualColetado,
} from './valor-coletado.validators.js';
