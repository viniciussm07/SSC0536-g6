import { SELECOES_GRUPO } from './catalogo.constants.js';
import type {
  FormularioCatalogo,
  GrupoCatalogo,
  GrupoCatalogoLinha,
  ItemCatalogo,
  ItemCatalogoLinha,
  VersaoItemCatalogo,
} from './catalogo.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const natural = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const texto = (v: unknown) => typeof v === 'string' && v.length > 0;
const textoOuNulo = (v: unknown) => v === null || typeof v === 'string';
const selecao = (v: unknown) =>
  typeof v === 'string' && (SELECOES_GRUPO as readonly string[]).includes(v);

export function isItemCatalogo(v: unknown): v is ItemCatalogo {
  return (
    objeto(v) &&
    id(v.id) &&
    id(v.grupoId) &&
    texto(v.chave) &&
    texto(v.rotulo) &&
    typeof v.exclusivo === 'boolean' &&
    typeof v.outro === 'boolean' &&
    typeof v.aceitaQuantidade === 'boolean' &&
    natural(v.ordem) &&
    typeof v.ativo === 'boolean' &&
    id(v.versao)
  );
}
export function isGrupoCatalogo(v: unknown): v is GrupoCatalogo {
  return (
    objeto(v) &&
    id(v.id) &&
    id(v.segmentoId) &&
    texto(v.chave) &&
    texto(v.pergunta) &&
    selecao(v.selecao) &&
    typeof v.permiteOutro === 'boolean' &&
    textoOuNulo(v.secao) &&
    natural(v.ordem) &&
    typeof v.ativo === 'boolean' &&
    Array.isArray(v.itens) &&
    v.itens.every(isItemCatalogo)
  );
}
export function isFormularioCatalogo(v: unknown): v is FormularioCatalogo {
  return (
    objeto(v) &&
    id(v.segmentoId) &&
    Array.isArray(v.grupos) &&
    v.grupos.every(isGrupoCatalogo)
  );
}
export function isGrupoCatalogoLinha(v: unknown): v is GrupoCatalogoLinha {
  return (
    objeto(v) &&
    id(v.id) &&
    id(v.segmentoId) &&
    texto(v.chave) &&
    texto(v.pergunta) &&
    textoOuNulo(v.secao) &&
    selecao(v.selecao) &&
    typeof v.permiteOutro === 'boolean' &&
    natural(v.ordem) &&
    typeof v.ativo === 'boolean'
  );
}
export function isItemCatalogoLinha(v: unknown): v is ItemCatalogoLinha {
  return isItemCatalogo(v) && texto((v as unknown as Objeto).grupoChave);
}
export function isVersaoItemCatalogo(v: unknown): v is VersaoItemCatalogo {
  return (
    objeto(v) &&
    id(v.numero) &&
    texto(v.rotulo) &&
    texto(v.pergunta) &&
    selecao(v.selecao) &&
    typeof v.exclusivo === 'boolean' &&
    typeof v.outro === 'boolean' &&
    typeof v.aceitaQuantidade === 'boolean' &&
    typeof v.criadaEm === 'string' &&
    !Number.isNaN(Date.parse(v.criadaEm)) &&
    textoOuNulo(v.motivo)
  );
}
