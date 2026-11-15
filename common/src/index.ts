export { API_PREFIX, PAGINATION } from './api/index.js';
export { isPaginatedResponse } from './api/index.js';
export type {
  CodigoAtivacaoConta,
  EmpreendimentoResumo,
  RespostaResumo,
  InventarioResumo,
  IndicadorConsulta,
} from './acesso/index.js';
export {
  isAcessoAtual,
  isContaResumo,
  isCodigoAtivacaoConta,
  isEmpreendimentoResumo,
  isRespostaResumo,
  isInventarioResumo,
  isIndicadorConsulta,
  isVinculoConta,
  isVisibilidadeIndicador,
} from './acesso/index.js';
export {
  PERFIS,
  RECURSOS_ACESSO,
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  ACESSO_RECURSOS,
  PERMISSOES_INICIAIS,
  CABECALHO_CONTEXTO,
  interpretarContextoEntidade,
  isPerfil,
  isPermissaoAcesso,
  permissaoCompativel,
} from './acesso/index.js';
export type {
  Perfil,
  RecursoAcesso,
  AcaoAcesso,
  EscopoAcesso,
  PermissaoAcesso,
  VinculoAcesso,
  AcessoAtual,
  ContaResumo,
  CriarConta,
  AlterarConta,
  VinculoConta,
  VisibilidadeIndicador,
  ContextoEntidadeEntrada,
} from './acesso/index.js';
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
