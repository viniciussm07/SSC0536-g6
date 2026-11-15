import { CAMPOS_CAPACIDADE } from './versao.constants.js';
import type {
  DiferencaItem,
  DiferencasInventario,
  ItemVersaoInventario,
  VersaoInventarioDetalhe,
} from './versao.types.js';

const igualItem = (a: ItemVersaoInventario, b: ItemVersaoInventario) =>
  a.estado === b.estado &&
  a.detalhe === b.detalhe &&
  a.quantidade === b.quantidade;

/** Compara duas versões: capacidade por campo (estado e valor), itens do catálogo e vigência. */
export function compararVersoesInventario(
  antes: VersaoInventarioDetalhe,
  depois: VersaoInventarioDetalhe,
): DiferencasInventario {
  const campos = CAMPOS_CAPACIDADE.flatMap((campo) => {
    const a = antes.capacidade[campo];
    const d = depois.capacidade[campo];
    return a.estado === d.estado && a.valor === d.valor
      ? []
      : [{ campo, antes: a, depois: d }];
  });
  const porItem = (v: VersaoInventarioDetalhe) =>
    new Map(v.itens.map((i) => [i.itemId, i]));
  const a = porItem(antes);
  const d = porItem(depois);
  const itens: DiferencaItem[] = [];
  for (const [itemId, depoisItem] of d) {
    const antesItem = a.get(itemId) ?? null;
    if (!antesItem)
      itens.push({
        itemId,
        tipo: 'adicionado',
        antes: null,
        depois: depoisItem,
      });
    else if (!igualItem(antesItem, depoisItem))
      itens.push({
        itemId,
        tipo: 'alterado',
        antes: antesItem,
        depois: depoisItem,
      });
  }
  for (const [itemId, antesItem] of a)
    if (!d.has(itemId))
      itens.push({ itemId, tipo: 'removido', antes: antesItem, depois: null });
  itens.sort((x, y) => x.itemId - y.itemId);
  const mudouVigencia =
    antes.vigenciaInicio !== depois.vigenciaInicio ||
    antes.vigenciaFim !== depois.vigenciaFim;
  return {
    campos,
    itens,
    vigencia: mudouVigencia
      ? {
          antes: [antes.vigenciaInicio, antes.vigenciaFim],
          depois: [depois.vigenciaInicio, depois.vigenciaFim],
        }
      : null,
  };
}
