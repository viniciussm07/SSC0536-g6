import {
  calcularPendencias,
  type CadasturCadastro,
  type ContatoCadastro,
  type EmpreendimentoDetalhe,
  type EmpreendimentoListado,
  type SegmentoResumo,
  type SituacaoCadastur,
  type TipoContato,
  type FinalidadeContato,
  type PendenciaCadastro,
  type Zona,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';

type Db = Prisma.TransactionClient;
const dia = (data: Date | null) => data?.toISOString().slice(0, 10) ?? null;

/** Campos e contagens necessários à linha da listagem e ao cálculo de pendências. */
export const dataInventarioGrade = () =>
  new Date(
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    ) + 'T00:00:00.000Z',
  );
export const vigenciaGrade = (
  data: Date,
): Prisma.InventarioVersaoWhereInput => ({
  substituidaPorId: null,
  vigenciaInicio: { lte: data },
  OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: data } }],
});
export const selectListado = (
  data: Date,
  escopo: Prisma.InventarioVersaoWhereInput,
) =>
  ({
    id: true,
    nomeFantasia: true,
    razaoSocial: true,
    cnpj: true,
    situacao: true,
    tipoHospedagem: true,
    categoriaIndicador: true,
    endereco: true,
    zona: true,
    inventarios: {
      where: { AND: [vigenciaGrade(data), escopo] },
      take: 1,
      orderBy: { id: 'desc' },
      select: {
        totalUh: true,
        leitos: true,
        funcFixos: true,
        funcTemporarios: true,
      },
    },
    _count: { select: { segmentos: true, contatos: true, cadastur: true } },
  }) satisfies Prisma.EmpreendimentoSelect;

export function paraListado(
  linha: Prisma.EmpreendimentoGetPayload<{
    select: ReturnType<typeof selectListado>;
  }>,
): EmpreendimentoListado {
  return {
    id: linha.id,
    nomeFantasia: linha.nomeFantasia,
    cnpj: linha.cnpj,
    situacao: linha.situacao,
    tipoHospedagem: linha.tipoHospedagem,
    zona: linha.zona as Zona | null,
    endereco: linha.endereco,
    totalUh: linha.inventarios[0]?.totalUh ?? null,
    leitos: linha.inventarios[0]?.leitos ?? null,
    funcFixos: linha.inventarios[0]?.funcFixos ?? null,
    funcTemporarios: linha.inventarios[0]?.funcTemporarios ?? null,
    pendencias: calcularPendencias({
      cnpj: linha.cnpj,
      razaoSocial: linha.razaoSocial,
      tipoHospedagem: linha.tipoHospedagem,
      categoriaIndicador: linha.categoriaIndicador,
      endereco: linha.endereco,
      segmentos: linha._count.segmentos,
      contatos: linha._count.contatos,
      cadastur: linha._count.cadastur,
    }),
  };
}

/** `where` de cada informação faltante do cadastro (lógica de dois valores). */
export const CONDICOES_PENDENCIA: Record<
  PendenciaCadastro,
  Prisma.EmpreendimentoWhereInput
> = {
  sem_cnpj: { cnpj: null },
  sem_razao_social: { razaoSocial: null },
  sem_tipo_hospedagem: { tipoHospedagem: null },
  sem_categoria_indicador: { categoriaIndicador: null },
  sem_endereco: { endereco: null },
  sem_segmento: { segmentos: { none: {} } },
  sem_contato: { contatos: { none: {} } },
  sem_cadastur: { cadastur: { none: {} } },
};

/** Detalhe completo (inclui coordenadas, lidas por SQL porque o Prisma não tipa `geography`). */
export async function lerDetalhe(
  db: Db,
  id: number,
): Promise<EmpreendimentoDetalhe | null> {
  const e = await db.empreendimento.findUnique({
    where: { id },
    include: {
      segmentos: {
        include: { segmento: true },
        orderBy: { segmentoId: 'asc' },
      },
      contatos: { orderBy: { id: 'asc' } },
      cadastur: { orderBy: { id: 'asc' } },
    },
  });
  if (!e) return null;
  const [geo] = await db.$queryRaw<
    { lon: number | null; lat: number | null }[]
  >`SELECT ST_X(localizacao::geometry) AS lon, ST_Y(localizacao::geometry) AS lat
      FROM empreendimento WHERE id = ${id}`;
  const segmentos: SegmentoResumo[] = e.segmentos.map((s) => ({
    id: s.segmento.id,
    chave: s.segmento.chave,
    nome: s.segmento.nome,
    nivelCadastro: s.segmento.nivelCadastro,
  }));
  const contatos: ContatoCadastro[] = e.contatos.map((c) => ({
    id: c.id,
    tipo: c.tipo as TipoContato,
    valor: c.valor,
    finalidade: c.finalidade as FinalidadeContato,
    responsavelNome: c.responsavelNome,
    responsavelCargo: c.responsavelCargo,
  }));
  const cadastur: CadasturCadastro[] = e.cadastur.map((c) => ({
    id: c.id,
    situacao: c.situacao as SituacaoCadastur,
    numero: c.numero,
    vencimento: dia(c.vencimento),
  }));
  return {
    id: e.id,
    nomeFantasia: e.nomeFantasia,
    razaoSocial: e.razaoSocial,
    cnpj: e.cnpj,
    idOrigem: e.idOrigem,
    situacao: e.situacao,
    tipoHospedagem: e.tipoHospedagem,
    categoriaIndicador: e.categoriaIndicador,
    endereco: e.endereco,
    zona: e.zona as Zona | null,
    localizacao:
      geo?.lon != null && geo.lat != null
        ? { longitude: geo.lon, latitude: geo.lat }
        : null,
    dataInicioAtividades: dia(e.dataInicioAtividades),
    dataEncerramento: dia(e.dataEncerramento),
    segmentos,
    contatos,
    cadastur,
    pendencias: calcularPendencias({
      cnpj: e.cnpj,
      razaoSocial: e.razaoSocial,
      tipoHospedagem: e.tipoHospedagem,
      categoriaIndicador: e.categoriaIndicador,
      endereco: e.endereco,
      segmentos: segmentos.length,
      contatos: contatos.length,
      cadastur: cadastur.length,
    }),
  };
}
