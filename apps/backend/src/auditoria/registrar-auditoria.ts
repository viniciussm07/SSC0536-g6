import { Prisma } from '../generated/prisma/client';
import { snapshotSeguro } from './snapshots';

type Registro = {
  entidade: string;
  entidadeId: number;
  acao: 'criar' | 'alterar' | 'excluir';
  antes?: unknown;
  depois?: unknown;
  correlacaoId?: string;
} & (
  | { usuarioId: number; processo?: never }
  | { usuarioId?: never; processo: string }
);

/** Recebe apenas a transação de negócio: falha na auditoria aborta a mesma transação. */
export async function registrarAuditoria(
  tx: Prisma.TransactionClient,
  entrada: Registro,
) {
  const automatica = entrada.processo !== undefined;
  if (
    automatica &&
    (entrada.usuarioId !== undefined ||
      !/^[a-zA-Z0-9._:-]{1,120}$/.test(entrada.processo!))
  )
    throw new Error('Processo de auditoria inválido.');
  if (
    entrada.correlacaoId !== undefined &&
    !/^[a-zA-Z0-9._:-]{1,120}$/.test(entrada.correlacaoId)
  )
    throw new Error('Correlação de auditoria inválida.');
  const usuario = automatica
    ? null
    : await tx.usuario.findUniqueOrThrow({
        where: { id: entrada.usuarioId! },
        select: { nome: true },
      });
  const antes = snapshotSeguro(entrada.entidade, entrada.antes),
    depois = snapshotSeguro(entrada.entidade, entrada.depois);
  return tx.auditoria.create({
    data: {
      usuarioId: automatica ? null : entrada.usuarioId,
      autorNome: usuario?.nome ?? entrada.processo,
      origem: automatica ? 'automatica' : 'manual',
      processo: entrada.processo ?? null,
      correlacaoId: entrada.correlacaoId ?? null,
      entidade: entrada.entidade,
      entidadeId: entrada.entidadeId,
      acao: entrada.acao,
      antes: antes === null ? Prisma.JsonNull : antes,
      depois: depois === null ? Prisma.JsonNull : depois,
      em: new Date(),
    },
  });
}
