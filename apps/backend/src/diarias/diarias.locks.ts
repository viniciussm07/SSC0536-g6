import type { Prisma } from '../generated/prisma/client';

/**
 * Serializa operações concorrentes sobre a mesma chave natural dentro da transação.
 * `hashtext` pode colidir, mas apenas aumenta a serialização; não enfraquece a regra.
 */
export async function travarPorChave(
  tx: Prisma.TransactionClient,
  chave: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${chave}))`;
}
