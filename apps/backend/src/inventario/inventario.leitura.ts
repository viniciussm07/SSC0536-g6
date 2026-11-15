import {
  CAMPOS_CAPACIDADE,
  type CampoCapacidade,
  type CapacidadeInventario,
  type EstadoCampoInventario,
  type ItemVersaoInventario,
  type RespostaItemInventario,
  type SituacaoConferenciaInventario,
  type TipoAlteracaoInventario,
  type ValorCapacidade,
  type VersaoInventarioDetalhe,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';

type Db = Prisma.TransactionClient;
export const incluirVersao = {
  criador: { select: { nome: true } },
  itens: { include: { snapshot: true } },
} satisfies Prisma.InventarioVersaoInclude;
export type VersaoBanco = Prisma.InventarioVersaoGetPayload<{
  include: typeof incluirVersao;
}>;

const hhmm = (d: Date) => d.toISOString().slice(11, 16);
export const horaParaBanco = (hhmmTexto: string) =>
  new Date(`1970-01-01T${hhmmTexto}:00.000Z`);
const dia = (d: Date) => d.toISOString().slice(0, 10);

type Estados = Partial<Record<CampoCapacidade, EstadoCampoInventario>>;
/** Coluna nula sem estado gravado (dado legado) lê-se como desconhecido, sem inventar motivo. */
function valorDoCampo(
  campo: CampoCapacidade,
  row: VersaoBanco,
): ValorCapacidade<number | boolean | string> {
  const bruto = row[campo as keyof VersaoBanco] as
    number | boolean | Date | null;
  const estados = (row.estados ?? {}) as Estados;
  if (bruto === null || bruto === undefined) {
    const estado = estados[campo];
    return {
      estado: estado && estado !== 'informado' ? estado : 'desconhecido',
      valor: null,
    };
  }
  return {
    estado: 'informado',
    valor: bruto instanceof Date ? hhmm(bruto) : bruto,
  };
}

export function paraCapacidade(row: VersaoBanco): CapacidadeInventario {
  return Object.fromEntries(
    CAMPOS_CAPACIDADE.map((c) => [c, valorDoCampo(c, row)]),
  ) as unknown as CapacidadeInventario;
}

export function paraItens(row: VersaoBanco): ItemVersaoInventario[] {
  return [...row.itens]
    .sort((a, b) => a.itemId - b.itemId)
    .map((i) => ({
      itemId: i.itemId,
      itemVersao: i.itemVersao,
      rotulo: i.snapshot.rotulo,
      pergunta: i.snapshot.pergunta,
      estado: i.estado as RespostaItemInventario['estado'],
      detalhe: i.detalhe,
      quantidade: i.quantidade,
    }));
}

export function paraDetalhe(row: VersaoBanco): VersaoInventarioDetalhe {
  return {
    id: row.id,
    empreendimentoId: row.empreendimentoId,
    vigenciaInicio: dia(row.vigenciaInicio),
    vigenciaFim: row.vigenciaFim ? dia(row.vigenciaFim) : null,
    tipoAlteracao: row.tipoAlteracao as TipoAlteracaoInventario,
    situacaoConferencia:
      row.situacaoConferencia as SituacaoConferenciaInventario,
    motivo: row.motivo,
    criadaEm: row.criadaEm.toISOString(),
    autor: row.criador.nome,
    substituidaPorId: row.substituidaPorId,
    capacidade: paraCapacidade(row),
    itens: paraItens(row),
  };
}

export const lerVersao = (db: Db, empreendimentoId: number, id: number) =>
  db.inventarioVersao.findFirst({
    where: { id, empreendimentoId },
    include: incluirVersao,
  });
