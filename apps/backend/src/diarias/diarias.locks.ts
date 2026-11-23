import type { Prisma } from '../generated/prisma/client';

/**
 * Serializa operações concorrentes sobre a mesma chave natural dentro da transação.
 * `hashtext` pode colidir, mas apenas aumenta a serialização; não enfraquece a regra.
 */
export async function travarPorChave(
  tx: Prisma.TransactionClient,
  chave: string,
) {
  // A função retorna `void`, que o Prisma não desserializa. A subconsulta executa o lock e
  // expõe apenas um inteiro legível.
  await tx.$queryRaw`
    WITH lock AS (
      SELECT pg_advisory_xact_lock(hashtext(${chave}))
    )
    SELECT 1 AS "locked" FROM lock
  `;
}
