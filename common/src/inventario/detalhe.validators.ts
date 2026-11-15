import { ESTADOS_ITEM_INVENTARIO } from '../catalogo/catalogo.constants.js';
import {
  CAMPOS_CAPACIDADE,
  ESTADOS_CAMPO_INVENTARIO,
  TIPOS_ALTERACAO_INVENTARIO,
} from './versao.constants.js';
import type { VersaoInventarioDetalhe } from './versao.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const data = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
const incluido = (lista: readonly string[], v: unknown) =>
  typeof v === 'string' && lista.includes(v);

function campoValido(nome: string, v: unknown) {
  if (!objeto(v) || !incluido(ESTADOS_CAMPO_INVENTARIO, v.estado)) return false;
  if (v.estado !== 'informado') return v.valor === null;
  if (nome === 'funciona24h') return typeof v.valor === 'boolean';
  if (nome === 'checkin' || nome === 'checkout')
    return typeof v.valor === 'string' && /^\d\d:\d\d$/.test(v.valor);
  return (
    typeof v.valor === 'number' && Number.isSafeInteger(v.valor) && v.valor >= 0
  );
}

export function isVersaoInventarioDetalhe(
  v: unknown,
): v is VersaoInventarioDetalhe {
  return (
    objeto(v) &&
    id(v.id) &&
    id(v.empreendimentoId) &&
    data(v.vigenciaInicio) &&
    (v.vigenciaFim === null || data(v.vigenciaFim)) &&
    incluido(TIPOS_ALTERACAO_INVENTARIO, v.tipoAlteracao) &&
    incluido(['completo', 'parcial', 'pendente'], v.situacaoConferencia) &&
    (v.motivo === null || typeof v.motivo === 'string') &&
    typeof v.criadaEm === 'string' &&
    !Number.isNaN(Date.parse(v.criadaEm)) &&
    typeof v.autor === 'string' &&
    (v.substituidaPorId === null || id(v.substituidaPorId)) &&
    objeto(v.capacidade) &&
    CAMPOS_CAPACIDADE.every((c) =>
      campoValido(c, (v.capacidade as Objeto)[c]),
    ) &&
    Array.isArray(v.itens) &&
    v.itens.every(
      (i) =>
        objeto(i) &&
        id(i.itemId) &&
        id(i.itemVersao) &&
        typeof i.rotulo === 'string' &&
        typeof i.pergunta === 'string' &&
        incluido(ESTADOS_ITEM_INVENTARIO, i.estado) &&
        (i.detalhe === null || typeof i.detalhe === 'string') &&
        (i.quantidade === null ||
          (typeof i.quantidade === 'number' && i.quantidade >= 0)),
    )
  );
}
