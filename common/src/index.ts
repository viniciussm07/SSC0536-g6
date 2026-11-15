export { API_PREFIX, PAGINATION } from './api/index.js';
export {
  AUTENTICACAO_RECURSOS,
  SENHA_LIMITES,
  isSessaoAtual,
} from './autenticacao/index.js';
export type {
  IdentidadeSessao,
  SessaoAtual,
  EntradaLogin,
  EntradaAtivacao,
} from './autenticacao/index.js';
export type {
  ApiResponse,
  ApiErrorResponse,
  PaginationMeta,
  PaginatedResponse,
} from './api/index.js';
export {
  HEALTH_RESOURCE,
  HEALTH_STATUS,
  DATABASE_STATUS,
  isHealthResponse,
} from './health/index.js';
export type { HealthResponse, HealthErrorResponse } from './health/index.js';
export {
  CONTRATO_DADOS_VERSAO,
  FUSO_OPERACIONAL,
  normalizarTextoColetado,
  normalizarQuantidadeColetada,
  normalizarBooleanoColetado,
  normalizarDataColetada,
  normalizarHorarioColetado,
  normalizarDecimalColetado,
  normalizarPercentualColetado,
} from './coleta/index.js';
export { normalizarCapacidadeInventario } from './inventario/index.js';
export type {
  CapacidadeInventarioColetada,
  ResultadoCapacidadeInventario,
} from './inventario/index.js';
export type {
  ValorColetado,
  ResultadoNormalizacao,
  EscalaPercentual,
} from './coleta/index.js';
