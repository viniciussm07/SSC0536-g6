import { normalizarCnpj, type CandidatoDuplicidade } from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';

const COM_ACENTO = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç';
const SEM_ACENTO = 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc';

/**
 * Chave de comparação de nomes: sem acentos (conjunto do português), sem caixa e com tudo que
 * não é letra/dígito reduzido a um espaço. Deve coincidir com `chaveNomeSql`.
 */
export function chaveNome(nome: string) {
  let semAcento = '';
  for (const caractere of nome) {
    const i = COM_ACENTO.indexOf(caractere);
    semAcento += i >= 0 ? SEM_ACENTO[i] : caractere;
  }
  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export const chaveNomeSql = (coluna: string) =>
  `btrim(regexp_replace(lower(translate(${coluna}, '${COM_ACENTO}', '${SEM_ACENTO}')), '[^a-z0-9]+', ' ', 'g'))`;

const mascara = (digitos: string) =>
  digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

/**
 * Candidatos a duplicidade: mesmo CNPJ, mesmo ID de origem ou mesmo nome normalizado.
 * Nomes apenas parecidos (por exemplo, "Alfa" e "Alfa II") NÃO são tratados como duplicados:
 * homônimos não são fundidos nem bloqueados automaticamente (R01).
 */
export async function buscarCandidatos(
  tx: Prisma.TransactionClient,
  dados: {
    nomeFantasia?: string;
    cnpj?: string | null;
    idOrigem?: string | null;
  },
  ignorarId?: number,
): Promise<CandidatoDuplicidade[]> {
  const idsPorNome =
    dados.nomeFantasia && chaveNome(dados.nomeFantasia)
      ? (
          await tx.$queryRawUnsafe<{ id: number }[]>(
            `SELECT id FROM empreendimento WHERE ${chaveNomeSql('nome_fantasia')} = $1`,
            chaveNome(dados.nomeFantasia),
          )
        ).map((l) => l.id)
      : [];
  const digitos = dados.cnpj ? normalizarCnpj(dados.cnpj) : null;
  const filtros: Prisma.EmpreendimentoWhereInput[] = [];
  if (idsPorNome.length) filtros.push({ id: { in: idsPorNome } });
  if (digitos) filtros.push({ cnpj: { in: [digitos, mascara(digitos)] } });
  if (dados.idOrigem) filtros.push({ idOrigem: dados.idOrigem });
  if (!filtros.length) return [];
  const linhas = await tx.empreendimento.findMany({
    where: {
      AND: [ignorarId ? { id: { not: ignorarId } } : {}, { OR: filtros }],
    },
    select: {
      id: true,
      nomeFantasia: true,
      cnpj: true,
      idOrigem: true,
      situacao: true,
    },
    orderBy: { id: 'asc' },
    take: 20,
  });
  return linhas.map((l) => {
    const motivos: CandidatoDuplicidade['motivos'] = [];
    if (idsPorNome.includes(l.id)) motivos.push('nome_igual');
    if (digitos && l.cnpj && normalizarCnpj(l.cnpj) === digitos)
      motivos.push('cnpj_igual');
    if (dados.idOrigem && l.idOrigem === dados.idOrigem)
      motivos.push('id_origem_igual');
    return {
      id: l.id,
      nomeFantasia: l.nomeFantasia,
      cnpj: l.cnpj,
      situacao: l.situacao,
      motivos,
    };
  });
}
