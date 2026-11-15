export type {
  CapacidadeInventarioColetada,
  ResultadoCapacidadeInventario,
} from './capacidade.types.js';
export { normalizarCapacidadeInventario } from './capacidade.validators.js';
export {
  TIPOS_ALTERACAO_INVENTARIO,
  CAMPOS_CAPACIDADE,
  ESTADOS_CAMPO_INVENTARIO,
  LIMITES_INVENTARIO,
} from './versao.constants.js';
export type {
  TipoAlteracaoInventario,
  CampoCapacidade,
  EstadoCampoInventario,
  SituacaoConferenciaInventario,
  ValorCapacidade,
  CapacidadeInventario,
  ItemVersaoInventario,
  VersaoInventarioDetalhe,
  EntradaVersaoInventario,
  EntradaConferenciaInventario,
  VigenciaExistente,
  PlanoVigencia,
  DiferencaCampo,
  DiferencaItem,
  DiferencasInventario,
} from './versao.types.js';
export {
  diaAnterior,
  diaSeguinte,
  localizarVigente,
  planejarMudancaReal,
  planejarCorrecao,
  ehRetroativa,
} from './vigencia.validators.js';
export {
  validarEntradaVersaoInventario,
  validarEntradaConferenciaInventario,
} from './entrada.validators.js';
export { podeSerCompleta } from './conferencia.validators.js';
export { compararVersoesInventario } from './diferencas.js';
export { isVersaoInventarioDetalhe } from './detalhe.validators.js';
