import type {
  GrupoCatalogo,
  ItemCatalogo,
  SelecaoGrupo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';

export type ItemBanco = Prisma.CatalogoItemGetPayload<object>;
export type GrupoBanco = Prisma.CatalogoGrupoGetPayload<{
  include: { itens: true };
}>;

export const paraItem = (i: ItemBanco): ItemCatalogo => ({
  id: i.id,
  grupoId: i.grupoId,
  chave: i.chave,
  rotulo: i.rotulo,
  exclusivo: i.exclusivo,
  outro: i.outro,
  aceitaQuantidade: i.aceitaQuantidade,
  ordem: i.ordem,
  ativo: i.ativo,
  versao: i.versaoAtual,
});
export const paraGrupo = (g: GrupoBanco): GrupoCatalogo => ({
  id: g.id,
  segmentoId: g.segmentoId,
  chave: g.chave,
  pergunta: g.pergunta,
  selecao: g.selecao as SelecaoGrupo,
  permiteOutro: g.permiteOutro,
  secao: g.secao,
  ordem: g.ordem,
  ativo: g.ativo,
  itens: [...g.itens]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map(paraItem),
});
