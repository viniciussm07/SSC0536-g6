export {
  CATALOGO_RECURSOS,
  SELECOES_GRUPO,
  ESTADOS_ITEM_INVENTARIO,
  LIMITES_CATALOGO,
  PADRAO_CHAVE_CATALOGO,
} from './catalogo.constants.js';
export type {
  SelecaoGrupo,
  EstadoItemInventario,
  ItemCatalogo,
  GrupoCatalogo,
  FormularioCatalogo,
  GrupoCatalogoLinha,
  ItemCatalogoLinha,
  VersaoItemCatalogo,
  EntradaGrupoCatalogo,
  AlteracaoGrupoCatalogo,
  EntradaItemCatalogo,
  AlteracaoItemCatalogo,
  RespostaItemInventario,
  EntradaRespostasCatalogo,
} from './catalogo.types.js';
export {
  validarEntradaGrupoCatalogo,
  validarAlteracaoGrupoCatalogo,
  validarEntradaItemCatalogo,
  validarAlteracaoItemCatalogo,
  consistenciaItemFinal,
  validarRespostasCatalogo,
} from './regras.validators.js';
export type { OpcoesRespostasCatalogo } from './regras.validators.js';
export {
  isItemCatalogo,
  isGrupoCatalogo,
  isFormularioCatalogo,
  isGrupoCatalogoLinha,
  isItemCatalogoLinha,
  isVersaoItemCatalogo,
} from './detalhe.validators.js';
